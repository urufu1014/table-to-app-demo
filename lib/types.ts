import type { BILLING_STATUSES, JOB_STATUSES, ROLES } from "@/lib/constants";

export type Role = (typeof ROLES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  customer_code: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export type Site = {
  id: string;
  customer_id: string;
  name: string;
  postal_code: string | null;
  address: string;
};

export type JobWithRelations = {
  id: string;
  job_no: string;
  customer_id: string;
  site_id: string;
  inspection_type: string;
  assignee_id: string;
  scheduled_date: string;
  report_due_date: string;
  status: JobStatus;
  estimate_amount: number | null;
  billing_status: BillingStatus;
  notes: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  customers: Customer | null;
  sites: Site | null;
  assignee: Pick<Profile, "id" | "full_name" | "email"> | null;
  creator?: Pick<Profile, "id" | "full_name"> | null;
  updater?: Pick<Profile, "id" | "full_name"> | null;
};

export type JobHistoryItem = {
  id: string;
  job_id: string;
  actor_id: string;
  action: string;
  changed_fields: Record<string, { before: unknown; after: unknown }>;
  created_at: string;
  actor: Pick<Profile, "full_name" | "email"> | null;
};
