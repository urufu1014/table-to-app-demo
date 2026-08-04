"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { BILLING_STATUSES, JOB_STATUSES, billingStatusLabels, statusLabels } from "@/lib/constants";
import type { Customer, JobWithRelations, Profile, Site } from "@/lib/types";
import type { JobActionState } from "@/app/actions/jobs";

const initialState: JobActionState = { ok: false, message: "" };

export function JobForm({
  action,
  job,
  customers,
  sites,
  assignees,
  currentRole
}: {
  action: (state: JobActionState, formData: FormData) => Promise<JobActionState>;
  job?: JobWithRelations;
  customers: Customer[];
  sites: Site[];
  assignees: Profile[];
  currentRole: Profile["role"];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [dirty, setDirty] = useState(false);
  const [customerId, setCustomerId] = useState(job?.customer_id ?? customers[0]?.id ?? "");
  const filteredSites = sites.filter((site) => site.customer_id === customerId);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} onChange={() => setDirty(true)} className="grid min-w-0 gap-5 rounded-md border border-[var(--line)] bg-white p-5">
      {state.message ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          <AlertTriangle className="mr-1 inline" size={16} />
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="案件番号" error={errors.job_no?.[0]}>
          <input name="job_no" defaultValue={job?.job_no ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3" required />
        </Field>
        <Field label="点検種別" error={errors.inspection_type?.[0]}>
          <input name="inspection_type" defaultValue={job?.inspection_type ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3" required />
        </Field>
        <Field label="顧客" error={errors.customer_id?.[0]}>
          <select name="customer_id" value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3">
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customer_code} / {customer.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="現場" error={errors.site_id?.[0]}>
          <select name="site_id" defaultValue={job?.site_id ?? filteredSites[0]?.id ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3">
            {filteredSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} / {site.address}
              </option>
            ))}
          </select>
        </Field>
        <Field label="担当者" error={errors.assignee_id?.[0]}>
          <select name="assignee_id" defaultValue={job?.assignee_id ?? assignees[0]?.id ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3" disabled={currentRole === "staff"}>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.full_name} / {assignee.email}
              </option>
            ))}
          </select>
          {currentRole === "staff" ? <input type="hidden" name="assignee_id" value={assignees[0]?.id ?? ""} /> : null}
        </Field>
        <Field label="進捗" error={errors.status?.[0]}>
          <select name="status" defaultValue={job?.status ?? "scheduled"} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3">
            {JOB_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="点検予定日" error={errors.scheduled_date?.[0]}>
          <input name="scheduled_date" type="date" defaultValue={job?.scheduled_date ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3" required />
        </Field>
        <Field label="報告書提出期限" error={errors.report_due_date?.[0]}>
          <input name="report_due_date" type="date" defaultValue={job?.report_due_date ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3" required />
        </Field>
        <Field label="見積金額" error={errors.estimate_amount?.[0]}>
          <input name="estimate_amount" type="number" min="0" defaultValue={job?.estimate_amount ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3" />
        </Field>
        <Field label="請求状況" error={errors.billing_status?.[0]}>
          <select name="billing_status" defaultValue={job?.billing_status ?? "not_quoted"} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3">
            {BILLING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {billingStatusLabels[status]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="備考" error={errors.notes?.[0]}>
        <textarea name="notes" defaultValue={job?.notes ?? ""} rows={5} className="focus-ring rounded-md border border-[var(--line)] px-3 py-2" />
      </Field>
      <div className="flex justify-end">
        <Button disabled={pending} className="gap-2" onClick={() => setDirty(false)}>
          <Save size={18} />
          {pending ? "保存中" : "保存"}
        </Button>
      </div>
    </form>
  );
}
