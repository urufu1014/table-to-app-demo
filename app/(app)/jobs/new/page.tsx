import { createJobAction } from "@/app/actions/jobs";
import { JobForm } from "@/components/job-form";
import { requireProfile } from "@/lib/auth";
import type { Customer, Profile, Site } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const { profile, supabase } = await requireProfile();
  if (profile.role === "viewer") {
    return <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">閲覧者は案件を登録できません。</p>;
  }

  const [{ data: customers }, { data: sites }, { data: assignees }] = await Promise.all([
    supabase.from("customers").select("id, customer_code, name, phone, email").order("customer_code").returns<Customer[]>(),
    supabase.from("sites").select("id, customer_id, name, postal_code, address").order("name").returns<Site[]>(),
    supabase.from("profiles").select("id, full_name, email, role, is_active, created_at, updated_at").in("role", ["admin", "staff"]).eq("is_active", true).returns<Profile[]>()
  ]);

  const availableAssignees = profile.role === "staff" ? [profile] : assignees ?? [];

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">案件登録</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">必須項目、日付、金額、案件番号の重複を確認して保存します。</p>
      </div>
      <JobForm action={createJobAction} customers={customers ?? []} sites={sites ?? []} assignees={availableAssignees} currentRole={profile.role} />
    </div>
  );
}
