import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingStatus, JobStatus, JobWithRelations } from "@/lib/types";

export const JOB_LIST_SELECT =
  "*, customers(*), sites(*), assignee:profiles!inspection_jobs_assignee_id_fkey(id, full_name, email)";

export type JobListFilters = {
  q?: string | null;
  assignee?: string | null;
  status?: JobStatus | string | null;
  due?: "overdue" | "due_soon" | "normal" | string | null;
  billing?: BillingStatus | string | null;
};

type FetchJobsOptions = {
  from?: number;
  to?: number;
  orderBy?: "job_no" | "report_due_date";
  ascending?: boolean;
};

type IdRow = { id: string };

export function normalizeJobSearchTerm(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function ilikePattern(term: string) {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

function isoDateOffset(offsetDays: number, today = new Date()) {
  const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function selectIdsByIlike(supabase: SupabaseClient, table: string, column: string, pattern: string) {
  const { data, error } = await supabase.from(table).select("id").ilike(column, pattern).returns<IdRow[]>();
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

async function selectJobIdsByIn(supabase: SupabaseClient, column: "customer_id" | "site_id" | "assignee_id", ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("inspection_jobs").select("id").in(column, ids).returns<IdRow[]>();
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

async function resolveKeywordJobIds(supabase: SupabaseClient, rawKeyword: string | null | undefined) {
  const keyword = normalizeJobSearchTerm(rawKeyword);
  if (!keyword) return null;

  const pattern = ilikePattern(keyword);
  const [
    jobNoIds,
    inspectionTypeIds,
    notesIds,
    customerCodeIds,
    customerNameIds,
    siteNameIds,
    sitePostalCodeIds,
    siteAddressIds,
    assigneeNameIds,
    assigneeEmailIds
  ] = await Promise.all([
    selectIdsByIlike(supabase, "inspection_jobs", "job_no", pattern),
    selectIdsByIlike(supabase, "inspection_jobs", "inspection_type", pattern),
    selectIdsByIlike(supabase, "inspection_jobs", "notes", pattern),
    selectIdsByIlike(supabase, "customers", "customer_code", pattern),
    selectIdsByIlike(supabase, "customers", "name", pattern),
    selectIdsByIlike(supabase, "sites", "name", pattern),
    selectIdsByIlike(supabase, "sites", "postal_code", pattern),
    selectIdsByIlike(supabase, "sites", "address", pattern),
    selectIdsByIlike(supabase, "profiles", "full_name", pattern),
    selectIdsByIlike(supabase, "profiles", "email", pattern)
  ]);

  const [customerJobIds, siteJobIds, assigneeJobIds] = await Promise.all([
    selectJobIdsByIn(supabase, "customer_id", [...new Set([...customerCodeIds, ...customerNameIds])]),
    selectJobIdsByIn(supabase, "site_id", [...new Set([...siteNameIds, ...sitePostalCodeIds, ...siteAddressIds])]),
    selectJobIdsByIn(supabase, "assignee_id", [...new Set([...assigneeNameIds, ...assigneeEmailIds])])
  ]);

  return [
    ...new Set([
      ...jobNoIds,
      ...inspectionTypeIds,
      ...notesIds,
      ...customerJobIds,
      ...siteJobIds,
      ...assigneeJobIds
    ])
  ];
}

export async function fetchInspectionJobs(supabase: SupabaseClient, filters: JobListFilters, options: FetchJobsOptions = {}) {
  const searchIds = await resolveKeywordJobIds(supabase, filters.q);
  if (searchIds && searchIds.length === 0) return { jobs: [] as JobWithRelations[], count: 0 };

  let query = supabase
    .from("inspection_jobs")
    .select(JOB_LIST_SELECT, { count: "exact" })
    .order(options.orderBy ?? "report_due_date", { ascending: options.ascending ?? true });

  if (searchIds) query = query.in("id", searchIds);
  if (filters.assignee) query = query.eq("assignee_id", filters.assignee);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.billing) query = query.eq("billing_status", filters.billing);

  if (filters.due === "overdue") {
    query = query.neq("status", "completed").neq("status", "cancelled").lt("report_due_date", isoDateOffset(0));
  } else if (filters.due === "due_soon") {
    query = query
      .neq("status", "completed")
      .neq("status", "cancelled")
      .gte("report_due_date", isoDateOffset(0))
      .lte("report_due_date", isoDateOffset(7));
  } else if (filters.due === "normal") {
    query = query.neq("status", "completed").neq("status", "cancelled").gt("report_due_date", isoDateOffset(7));
  }

  if (typeof options.from === "number" && typeof options.to === "number") {
    query = query.range(options.from, options.to);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { jobs: (data ?? []) as unknown as JobWithRelations[], count: count ?? 0 };
}
