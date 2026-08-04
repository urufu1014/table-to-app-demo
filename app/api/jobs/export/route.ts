import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { billingStatusLabels, statusLabels } from "@/lib/constants";
import { toCsv } from "@/lib/csv";

type ExportJob = {
  job_no: string;
  inspection_type: string;
  scheduled_date: string;
  report_due_date: string;
  status: keyof typeof statusLabels;
  estimate_amount: number | null;
  billing_status: keyof typeof billingStatusLabels;
  notes: string | null;
  customers?: { customer_code?: string | null; name?: string | null } | null;
  sites?: { name?: string | null; postal_code?: string | null; address?: string | null } | null;
  assignee?: { full_name?: string | null; email?: string | null } | null;
};

export async function GET(request: Request) {
  const { supabase } = await requireProfile();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("inspection_jobs")
    .select("*, customers(name, customer_code), sites(name, postal_code, address), assignee:profiles!inspection_jobs_assignee_id_fkey(full_name, email)")
    .order("job_no");

  const q = searchParams.get("q");
  if (q) query = query.or(`job_no.ilike.%${q}%,inspection_type.ilike.%${q}%,notes.ilike.%${q}%`);
  const assignee = searchParams.get("assignee");
  if (assignee) query = query.eq("assignee_id", assignee);
  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);
  const billing = searchParams.get("billing");
  if (billing) query = query.eq("billing_status", billing);

  const { data } = await query;
  const csv = toCsv(
    ((data ?? []) as unknown as ExportJob[]).map((job) => ({
      job_no: job.job_no,
      customer_code: job.customers?.customer_code,
      customer_name: job.customers?.name,
      site_name: job.sites?.name,
      postal_code: job.sites?.postal_code,
      address: job.sites?.address,
      inspection_type: job.inspection_type,
      assignee_email: job.assignee?.email,
      assignee_name: job.assignee?.full_name,
      scheduled_date: job.scheduled_date,
      report_due_date: job.report_due_date,
      status: statusLabels[job.status as keyof typeof statusLabels],
      estimate_amount: job.estimate_amount,
      billing_status: billingStatusLabels[job.billing_status as keyof typeof billingStatusLabels],
      notes: job.notes
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inspection-jobs.csv"`
    }
  });
}
