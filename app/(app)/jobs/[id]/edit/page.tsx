import { updateJobAction } from "@/app/actions/jobs";
import { JobForm } from "@/components/job-form";
import { canEditAssignedJob, requireProfile } from "@/lib/auth";
import type { Customer, JobWithRelations, Profile, Site } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();
  const { data } = await supabase
    .from("inspection_jobs")
    .select("*, customers(*), sites(*), assignee:profiles!inspection_jobs_assignee_id_fkey(id, full_name, email)")
    .eq("id", id)
    .single();
  const job = data as unknown as JobWithRelations | null;

  if (!job || !canEditAssignedJob(profile, job.assignee_id)) {
    return <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">この案件を編集する権限がありません。</p>;
  }

  const [{ data: customers }, { data: sites }, { data: assignees }] = await Promise.all([
    supabase.from("customers").select("id, customer_code, name, phone, email").order("customer_code").returns<Customer[]>(),
    supabase.from("sites").select("id, customer_id, name, postal_code, address").order("name").returns<Site[]>(),
    supabase.from("profiles").select("id, full_name, email, role, is_active, created_at, updated_at").in("role", ["admin", "staff"]).eq("is_active", true).returns<Profile[]>()
  ]);

  const action = updateJobAction.bind(null, id);
  const availableAssignees = profile.role === "staff" ? [profile] : assignees ?? [];

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">案件編集</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{job.job_no} の内容を更新します。</p>
      </div>
      <JobForm action={action} job={job} customers={customers ?? []} sites={sites ?? []} assignees={availableAssignees} currentRole={profile.role} />
    </div>
  );
}
