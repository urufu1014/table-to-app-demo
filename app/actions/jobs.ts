"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditAssignedJob, requireProfile } from "@/lib/auth";
import { defaultAssigneeForRole } from "@/lib/jobs";
import { formDataToJobInput, jobInputSchema } from "@/lib/validation/job";

export type JobActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

const defaultError: JobActionState = { ok: false, message: "保存できませんでした。入力内容を確認してください。" };

export async function createJobAction(_prevState: JobActionState, formData: FormData): Promise<JobActionState> {
  const { profile, supabase } = await requireProfile();
  if (profile.role === "viewer") return { ok: false, message: "閲覧者は案件を登録できません。" };

  const parsed = jobInputSchema.safeParse(formDataToJobInput(formData));
  if (!parsed.success) {
    return { ...defaultError, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const input = {
    ...parsed.data,
    assignee_id: defaultAssigneeForRole(profile, parsed.data.assignee_id),
    created_by: profile.id,
    updated_by: profile.id
  };

  const { data, error } = await supabase.from("inspection_jobs").insert(input).select("id").single();
  if (error) {
    return { ok: false, message: error.code === "23505" ? "同じ案件番号がすでに登録されています。" : `保存に失敗しました: ${error.message}` };
  }

  revalidatePath("/jobs");
  redirect(`/jobs/${data.id}`);
}

export async function updateJobAction(jobId: string, _prevState: JobActionState, formData: FormData): Promise<JobActionState> {
  const { profile, supabase } = await requireProfile();
  if (profile.role === "viewer") return { ok: false, message: "閲覧者は案件を編集できません。" };

  const { data: existing, error: fetchError } = await supabase.from("inspection_jobs").select("*").eq("id", jobId).single();
  if (fetchError || !existing) return { ok: false, message: "案件が見つからないか、編集権限がありません。" };
  if (!canEditAssignedJob(profile, existing.assignee_id)) return { ok: false, message: "この案件を編集する権限がありません。" };

  const parsed = jobInputSchema.safeParse(formDataToJobInput(formData));
  if (!parsed.success) {
    return { ...defaultError, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const input = {
    ...parsed.data,
    assignee_id: defaultAssigneeForRole(profile, parsed.data.assignee_id),
    updated_by: profile.id
  };

  const { error } = await supabase.from("inspection_jobs").update(input).eq("id", jobId);
  if (error) {
    return { ok: false, message: error.code === "23505" ? "同じ案件番号がすでに登録されています。" : `保存に失敗しました: ${error.message}` };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}
