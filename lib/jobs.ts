import type { JobInput } from "@/lib/validation/job";
import type { JobWithRelations, Profile } from "@/lib/types";

export function buildChangedFields(before: Partial<JobWithRelations>, after: Partial<JobInput>) {
  const watched = [
    "job_no",
    "customer_id",
    "site_id",
    "inspection_type",
    "assignee_id",
    "scheduled_date",
    "report_due_date",
    "status",
    "estimate_amount",
    "billing_status",
    "notes"
  ] as const;

  return Object.fromEntries(
    watched
      .filter((key) => String(before[key as keyof JobWithRelations] ?? "") !== String(after[key as keyof JobInput] ?? ""))
      .map((key) => [key, { before: before[key as keyof JobWithRelations] ?? null, after: after[key as keyof JobInput] ?? null }])
  );
}

export function defaultAssigneeForRole(profile: Profile, requestedAssigneeId: string) {
  return profile.role === "staff" ? profile.id : requestedAssigneeId;
}
