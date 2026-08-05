import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseCsv } from "../../lib/csv.ts";
import { commitCsvImportRows, previewCsvImportRows } from "../../lib/server/csv-import.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.DEMO_PASSWORD;

function requireEnv(name: string, value: string | undefined) {
  assert.ok(value, `${name} is required for integration tests`);
  return value;
}

function isLocalSupabaseUrl(value: string) {
  const hostname = new URL(value).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getSupabaseProjectRef(value: string) {
  const hostname = new URL(value).hostname;
  if (!hostname.endsWith(".supabase.co")) return null;
  const parts = hostname.split(".");
  return parts[0] === "db" ? parts[1] : parts[0];
}

function assertRemoteTestAllowed(value: string) {
  if (isLocalSupabaseUrl(value)) return;

  assert.equal(process.env.ALLOW_REMOTE_TESTS, "true", "ALLOW_REMOTE_TESTS=true is required for remote integration tests");
  assert.equal(
    process.env.REMOTE_TEST_PROJECT_REF,
    "ecophxoxdnppzysccbrz",
    "REMOTE_TEST_PROJECT_REF must match the approved production demo project"
  );
  assert.equal(
    getSupabaseProjectRef(value),
    process.env.REMOTE_TEST_PROJECT_REF,
    "Supabase URL project ref must match REMOTE_TEST_PROJECT_REF"
  );
}

const requiredUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", url);
const requiredPublishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY", publishableKey);
const requiredAdminKey = requireEnv("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY", adminKey);
const requiredDemoPassword = requireEnv("DEMO_PASSWORD", demoPassword);
assertRemoteTestAllowed(requiredUrl);

const service = createClient(requiredUrl, requiredAdminKey, { auth: { persistSession: false } });

type ProfileRow = {
  id: string;
  email: string;
  role: "admin" | "staff" | "viewer";
  is_active: boolean;
};

type JobRow = {
  id: string;
  job_no: string;
  customer_id: string;
  site_id: string;
  assignee_id: string;
  scheduled_date: string;
  report_due_date: string;
  status: string;
  billing_status: string;
  notes: string | null;
};

async function login(email: string) {
  const client = createClient(requiredUrl, requiredPublishableKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: requiredDemoPassword });
  assert.equal(error, null, `${email} should log in`);
  assert.ok(data.user, `${email} should return an auth user`);
  return { client, userId: data.user.id };
}

async function getProfiles() {
  const { data, error } = await service.from("profiles").select("id,email,role,is_active").returns<ProfileRow[]>();
  assert.equal(error, null);
  const byRole = new Map(data?.map((profile) => [profile.role, profile]));
  const admin = byRole.get("admin");
  const staff = byRole.get("staff");
  const viewer = byRole.get("viewer");
  assert.ok(admin);
  assert.ok(staff);
  assert.ok(viewer);
  return { admin, staff, viewer };
}

async function firstCustomerAndSite(client: SupabaseClient) {
  const { data: customer, error: customerError } = await client.from("customers").select("id").limit(1).single<{ id: string }>();
  assert.equal(customerError, null);
  assert.ok(customer);
  const { data: site, error: siteError } = await client.from("sites").select("id").eq("customer_id", customer.id).limit(1).single<{ id: string }>();
  assert.equal(siteError, null);
  assert.ok(site);
  return { customerId: customer.id, siteId: site.id };
}

async function cleanupTestRows() {
  await service.from("inspection_jobs").delete().like("job_no", "IT-%");
  await service.from("inspection_jobs").delete().like("job_no", "CSV-2026-%");
  await service.from("inspection_jobs").delete().like("job_no", "ERR-2026-%");
  await service.from("import_batches").delete().in("filename", [
    "integration-normal.csv",
    "integration-normal-reimport.csv",
    "integration-errors.csv"
  ]);
}

describe("real Supabase Auth, RLS, history, and CSV import", () => {
  it("verifies role permissions, constraints, history, and CSV import against the local DB", async () => {
    await cleanupTestRows();
    try {
    const profiles = await getProfiles();
    assert.equal(profiles.admin.is_active, true);
    assert.equal(profiles.staff.is_active, true);
    assert.equal(profiles.viewer.is_active, true);

    const adminSession = await login("admin@table-to-app.example");
    const staffSession = await login("staff@table-to-app.example");
    const viewerSession = await login("viewer@table-to-app.example");
    assert.equal(adminSession.userId, profiles.admin.id);
    assert.equal(staffSession.userId, profiles.staff.id);
    assert.equal(viewerSession.userId, profiles.viewer.id);

    const anon = createClient(requiredUrl, requiredPublishableKey, { auth: { persistSession: false } });
    const { data: anonJobs, error: anonSelectError } = await anon.from("inspection_jobs").select("id");
    assert.equal(anonSelectError, null);
    assert.equal(anonJobs?.length ?? 0, 0);

    const { data: adminJobs, error: adminJobsError } = await adminSession.client
      .from("inspection_jobs")
      .select("id,job_no,customer_id,site_id,assignee_id,scheduled_date,report_due_date,status,billing_status,notes")
      .returns<JobRow[]>();
    assert.equal(adminJobsError, null);
    assert.ok((adminJobs?.length ?? 0) >= 50);

    const { data: staffJobs, error: staffJobsError } = await staffSession.client
      .from("inspection_jobs")
      .select("id,job_no,customer_id,site_id,assignee_id,scheduled_date,report_due_date,status,billing_status,notes")
      .returns<JobRow[]>();
    assert.equal(staffJobsError, null);
    assert.ok((staffJobs?.length ?? 0) > 0);
    assert.equal(staffJobs?.every((job) => job.assignee_id === profiles.staff.id), true);

    const { data: viewerJobs, error: viewerJobsError } = await viewerSession.client.from("inspection_jobs").select("id").returns<Array<{ id: string }>>();
    assert.equal(viewerJobsError, null);
    assert.ok((viewerJobs?.length ?? 0) >= 50);

    const { customerId, siteId } = await firstCustomerAndSite(adminSession.client);
    const adminOwnedJob = adminJobs?.find((job) => job.assignee_id === profiles.admin.id);
    assert.ok(adminOwnedJob);

    const { data: staffSelectOtherById, error: staffSelectOtherByIdError } = await staffSession.client
      .from("inspection_jobs")
      .select("id,assignee_id")
      .eq("id", adminOwnedJob.id)
      .returns<Array<{ id: string; assignee_id: string }>>();
    assert.equal(staffSelectOtherByIdError, null);
    assert.equal(staffSelectOtherById?.length ?? 0, 0);

    const { data: staffSelectOwnById, error: staffSelectOwnByIdError } = await staffSession.client
      .from("inspection_jobs")
      .select("id,assignee_id")
      .eq("id", staffJobs?.[0].id)
      .single<{ id: string; assignee_id: string }>();
    assert.equal(staffSelectOwnByIdError, null);
    assert.equal(staffSelectOwnById?.assignee_id, profiles.staff.id);

    const { data: adminSelectAdminOwned, error: adminSelectAdminOwnedError } = await adminSession.client
      .from("inspection_jobs")
      .select("id,assignee_id")
      .eq("id", adminOwnedJob.id)
      .single<{ id: string; assignee_id: string }>();
    assert.equal(adminSelectAdminOwnedError, null);
    assert.equal(adminSelectAdminOwned?.id, adminOwnedJob.id);

    const { data: viewerSelectAdminOwned, error: viewerSelectAdminOwnedError } = await viewerSession.client
      .from("inspection_jobs")
      .select("id,assignee_id")
      .eq("id", adminOwnedJob.id)
      .single<{ id: string; assignee_id: string }>();
    assert.equal(viewerSelectAdminOwnedError, null);
    assert.equal(viewerSelectAdminOwned?.id, adminOwnedJob.id);

    const suffix = randomUUID().slice(0, 8);
    const adminJobNo = `IT-ADMIN-${suffix}`;
    const { data: createdJob, error: createError } = await adminSession.client
      .from("inspection_jobs")
      .insert({
        job_no: adminJobNo,
        customer_id: customerId,
        site_id: siteId,
        inspection_type: "消防設備点検",
        assignee_id: profiles.staff.id,
        scheduled_date: "2026-08-10",
        report_due_date: "2026-08-12",
        status: "scheduled",
        estimate_amount: 50000,
        billing_status: "quoted",
        notes: "統合テスト作成",
        created_by: profiles.admin.id,
        updated_by: profiles.admin.id
      })
      .select("id, job_no")
      .single<{ id: string; job_no: string }>();
    assert.equal(createError, null);
    assert.ok(createdJob);

    const { error: duplicateError } = await adminSession.client.from("inspection_jobs").insert({
      job_no: adminJobNo,
      customer_id: customerId,
      site_id: siteId,
      inspection_type: "消防設備点検",
      assignee_id: profiles.staff.id,
      scheduled_date: "2026-08-10",
      report_due_date: "2026-08-12",
      status: "scheduled",
      billing_status: "quoted",
      created_by: profiles.admin.id,
      updated_by: profiles.admin.id
    });
    assert.equal(duplicateError?.code, "23505");

    const { data: createHistory, error: createHistoryError } = await service
      .from("job_history")
      .select("job_id, actor_id, action, changed_fields")
      .eq("job_id", createdJob.id)
      .eq("action", "create")
      .single<{ job_id: string; actor_id: string; action: string; changed_fields: Record<string, { before: unknown; after: unknown }> }>();
    assert.equal(createHistoryError, null);
    assert.equal(createHistory?.actor_id, profiles.admin.id);
    assert.equal(createHistory?.changed_fields.job_no.after, adminJobNo);

    const { data: staffUpdateOwn, error: staffUpdateOwnError } = await staffSession.client
      .from("inspection_jobs")
      .update({ status: "in_progress", notes: "staff update allowed", updated_by: profiles.staff.id })
      .eq("id", createdJob.id)
      .select("id,status,notes")
      .single<{ id: string; status: string; notes: string }>();
    assert.equal(staffUpdateOwnError, null);
    assert.equal(staffUpdateOwn?.status, "in_progress");

    const { data: staffUpdateOther, error: staffUpdateOtherError } = await staffSession.client
      .from("inspection_jobs")
      .update({ notes: "staff update denied", updated_by: profiles.staff.id })
      .eq("id", adminOwnedJob.id)
      .select("id");
    assert.equal(staffUpdateOtherError, null);
    assert.equal(staffUpdateOther?.length ?? 0, 0);

    const { error: staffBadInsertError } = await staffSession.client.from("inspection_jobs").insert({
      job_no: `IT-STAFF-BAD-${suffix}`,
      customer_id: customerId,
      site_id: siteId,
      inspection_type: "消防設備点検",
      assignee_id: profiles.admin.id,
      scheduled_date: "2026-08-10",
      report_due_date: "2026-08-12",
      status: "scheduled",
      billing_status: "quoted",
      created_by: profiles.staff.id,
      updated_by: profiles.staff.id
    });
    assert.ok(staffBadInsertError);

    const { error: staffBadHistoryError } = await staffSession.client.from("job_history").insert({
      job_id: adminOwnedJob.id,
      actor_id: profiles.staff.id,
      action: "forged",
      changed_fields: { forged: { before: null, after: true } }
    });
    assert.ok(staffBadHistoryError);

    const staffJobNo = `IT-STAFF-${suffix}`;
    const { data: staffCreatedJob, error: staffCreateError } = await staffSession.client
      .from("inspection_jobs")
      .insert({
        job_no: staffJobNo,
        customer_id: customerId,
        site_id: siteId,
        inspection_type: "空調設備点検",
        assignee_id: profiles.staff.id,
        scheduled_date: "2026-08-11",
        report_due_date: "2026-08-13",
        status: "scheduled",
        billing_status: "not_quoted",
        created_by: profiles.staff.id,
        updated_by: profiles.staff.id
      })
      .select("id")
      .single<{ id: string }>();
    assert.equal(staffCreateError, null);
    assert.ok(staffCreatedJob);

    const { error: viewerInsertError } = await viewerSession.client.from("inspection_jobs").insert({
      job_no: `IT-VIEWER-BAD-${suffix}`,
      customer_id: customerId,
      site_id: siteId,
      inspection_type: "消防設備点検",
      assignee_id: profiles.viewer.id,
      scheduled_date: "2026-08-10",
      report_due_date: "2026-08-12",
      status: "scheduled",
      billing_status: "quoted",
      created_by: profiles.viewer.id,
      updated_by: profiles.viewer.id
    });
    assert.ok(viewerInsertError);

    const { data: viewerUpdateData, error: viewerUpdateError } = await viewerSession.client
      .from("inspection_jobs")
      .update({ notes: "viewer update denied", updated_by: profiles.viewer.id })
      .eq("id", createdJob.id)
      .select("id");
    assert.equal(viewerUpdateError, null);
    assert.equal(viewerUpdateData?.length ?? 0, 0);

    const { data: viewerProfileUpdateData, error: viewerProfileUpdateError } = await viewerSession.client
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", profiles.viewer.id)
      .select("id");
    assert.equal(viewerProfileUpdateError, null);
    assert.equal(viewerProfileUpdateData?.length ?? 0, 0);

    const { data: adminUpdatedJob, error: adminUpdateError } = await adminSession.client
      .from("inspection_jobs")
      .update({
        assignee_id: profiles.admin.id,
        status: "report_preparing",
        scheduled_date: "2026-08-12",
        report_due_date: "2026-08-15",
        billing_status: "invoiced",
        notes: "admin update changed tracked fields",
        updated_by: profiles.admin.id
      })
      .eq("id", createdJob.id)
      .select("id")
      .single<{ id: string }>();
    assert.equal(adminUpdateError, null);
    assert.equal(adminUpdatedJob?.id, createdJob.id);

    const { data: updateHistory, error: updateHistoryError } = await service
      .from("job_history")
      .select("job_id, actor_id, action, changed_fields")
      .eq("job_id", createdJob.id)
      .eq("action", "update")
      .order("created_at", { ascending: false })
      .limit(1)
      .single<{ job_id: string; actor_id: string; action: string; changed_fields: Record<string, { before: unknown; after: unknown }> }>();
    assert.equal(updateHistoryError, null);
    assert.equal(updateHistory?.actor_id, profiles.admin.id);
    for (const field of ["assignee_id", "status", "scheduled_date", "report_due_date", "billing_status", "notes"]) {
      assert.ok(updateHistory?.changed_fields[field], `${field} should be tracked`);
    }

    const normalRows = parseCsv(readFileSync("legacy/sample-inspection-jobs.csv", "utf8")).data;
    const normalPreview = await previewCsvImportRows(adminSession.client, normalRows);
    assert.equal(normalPreview.totalRows, 20);
    assert.equal(normalPreview.validRows.length, 20);
    assert.equal(normalPreview.failedRowCount, 0);
    assert.equal(normalPreview.errorCount, 0);

    const normalImport = await commitCsvImportRows({
      supabase: adminSession.client,
      profileId: profiles.admin.id,
      filename: "integration-normal.csv",
      rows: normalRows
    });
    assert.equal(normalImport.successRows, 20);
    assert.equal(normalImport.failedRows, 0);
    assert.equal(normalImport.errorCount, 0);

    const { count: importedCsvJobs } = await service.from("inspection_jobs").select("*", { count: "exact", head: true }).like("job_no", "CSV-2026-%");
    assert.equal(importedCsvJobs, 20);

    const normalReimport = await commitCsvImportRows({
      supabase: adminSession.client,
      profileId: profiles.admin.id,
      filename: "integration-normal-reimport.csv",
      rows: normalRows
    });
    assert.equal(normalReimport.successRows, 0);
    assert.equal(normalReimport.failedRows, 20);
    assert.equal(normalReimport.errorCount, 20);
    assert.equal(normalReimport.errors.every((error) => error.errorCode === "duplicate_in_database"), true);

    const errorRows = parseCsv(readFileSync("legacy/sample-inspection-jobs-with-errors.csv", "utf8")).data;
    const errorPreview = await previewCsvImportRows(adminSession.client, errorRows);
    assert.equal(errorPreview.totalRows, 11);
    assert.ok(errorPreview.errors.some((error) => error.errorCode === "duplicate_in_file"));
    assert.ok(errorPreview.errors.some((error) => error.errorCode === "duplicate_in_database"));
    assert.ok(errorPreview.errors.some((error) => error.fieldName === "billing_status"));
    assert.ok(errorPreview.errors.some((error) => error.fieldName === "status"));
    assert.ok(errorPreview.errors.some((error) => error.fieldName === "estimate_amount"));
    assert.ok(errorPreview.errors.some((error) => error.fieldName === "assignee_email"));

    const errorImport = await commitCsvImportRows({
      supabase: adminSession.client,
      profileId: profiles.admin.id,
      filename: "integration-errors.csv",
      rows: errorRows
    });
    assert.equal(errorImport.totalRows, 11);
    assert.equal(errorImport.successRows, 1);
    assert.equal(errorImport.failedRows, 10);
    assert.ok(errorImport.errorCount >= 10);

    const { data: batches, error: batchesError } = await service
      .from("import_batches")
      .select("filename,total_rows,success_rows,failed_rows,imported_by")
      .in("filename", ["integration-normal.csv", "integration-normal-reimport.csv", "integration-errors.csv"])
      .order("created_at", { ascending: true })
      .returns<Array<{ filename: string; total_rows: number; success_rows: number; failed_rows: number; imported_by: string }>>();
    assert.equal(batchesError, null);
    assert.equal(batches?.length, 3);
    assert.equal(batches?.every((batch) => batch.imported_by === profiles.admin.id), true);
    assert.deepEqual(
      batches?.map((batch) => [batch.filename, batch.total_rows, batch.success_rows, batch.failed_rows]),
      [
        ["integration-normal.csv", 20, 20, 0],
        ["integration-normal-reimport.csv", 20, 0, 20],
        ["integration-errors.csv", 11, 1, 10]
      ]
    );

    const { count: importErrorCount } = await service.from("import_errors").select("*", { count: "exact", head: true });
    assert.ok((importErrorCount ?? 0) >= normalReimport.errorCount + errorImport.errorCount);

    const { count: invalidInsertedCount } = await service
      .from("inspection_jobs")
      .select("*", { count: "exact", head: true })
      .in("job_no", ["ERR-2026-0003", "ERR-2026-0004", "ERR-2026-0005", "ERR-2026-0006", "ERR-2026-0007", "ERR-2026-0008", "ERR-2026-0009"]);
    assert.equal(invalidInsertedCount, 0);
    } finally {
      await cleanupTestRows();
    }
  });
});
