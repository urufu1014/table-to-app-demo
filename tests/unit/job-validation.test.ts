import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BILLING_STATUSES, JOB_STATUSES } from "../../lib/constants.ts";
import { jobInputSchema } from "../../lib/validation/job.ts";

const baseJob = {
  job_no: "MDS-2026-9999",
  customer_id: "00000000-0000-4000-8000-000000000001",
  site_id: "00000000-0000-4000-8000-000000000002",
  inspection_type: "消防設備点検",
  assignee_id: "00000000-0000-4000-8000-000000000003",
  scheduled_date: "2026-08-10",
  report_due_date: "2026-08-12",
  status: "scheduled",
  estimate_amount: "120000",
  billing_status: "quoted",
  notes: "架空データ"
};

describe("jobInputSchema", () => {
  it("accepts a valid job", () => {
    assert.equal(jobInputSchema.safeParse(baseJob).success, true);
  });

  it("rejects a due date before scheduled date", () => {
    const result = jobInputSchema.safeParse({ ...baseJob, report_due_date: "2026-08-09" });
    assert.equal(result.success, false);
  });

  it("rejects a negative estimate amount", () => {
    const result = jobInputSchema.safeParse({ ...baseJob, estimate_amount: "-1" });
    assert.equal(result.success, false);
  });

  it("rejects unknown status and billing_status", () => {
    assert.equal(JOB_STATUSES.includes("scheduled"), true);
    assert.equal(BILLING_STATUSES.includes("quoted"), true);
    assert.equal(jobInputSchema.safeParse({ ...baseJob, status: "waiting" }).success, false);
    assert.equal(jobInputSchema.safeParse({ ...baseJob, billing_status: "sent" }).success, false);
  });
});
