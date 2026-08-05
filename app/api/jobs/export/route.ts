import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { billingStatusLabels, statusLabels } from "@/lib/constants";
import { toCsv } from "@/lib/csv";
import { fetchInspectionJobs } from "@/lib/server/job-query";

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

  const { jobs } = await fetchInspectionJobs(
    supabase,
    {
      q: searchParams.get("q"),
      assignee: searchParams.get("assignee"),
      status: searchParams.get("status"),
      due: searchParams.get("due"),
      billing: searchParams.get("billing")
    },
    { orderBy: "job_no" }
  );
  const csv = toCsv(
    (jobs as unknown as ExportJob[]).map((job) => ({
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
