import type { SupabaseClient } from "@supabase/supabase-js";
import { countCsvFailedRows, type CsvValidationError, validateCsvRows } from "../csv.ts";

type CsvImportParams = {
  supabase: SupabaseClient;
  profileId: string;
  filename: string;
  rows: Record<string, string>[];
};

function rowNumberForJobNo(rows: Record<string, string>[], jobNo: string) {
  const index = rows.findIndex((row) => row.job_no === jobNo);
  return index >= 0 ? index + 2 : 0;
}

async function getValidationContext(supabase: SupabaseClient) {
  const [{ data: jobs }, { data: profiles }] = await Promise.all([
    supabase.from("inspection_jobs").select("job_no"),
    supabase.from("profiles").select("id, email").in("role", ["admin", "staff"]).eq("is_active", true)
  ]);

  return {
    existingJobNos: new Set(((jobs ?? []) as Array<{ job_no: string }>).map((job) => job.job_no)),
    activeAssigneeEmails: new Set(((profiles ?? []) as Array<{ email: string | null }>).map((profile) => profile.email).filter(Boolean) as string[]),
    assigneeByEmail: new Map(((profiles ?? []) as Array<{ id: string; email: string | null }>).map((profile) => [profile.email, profile.id]))
  };
}

export async function previewCsvImportRows(supabase: SupabaseClient, rows: Record<string, string>[]) {
  const context = await getValidationContext(supabase);
  return validateCsvRows(rows, context.existingJobNos, context.activeAssigneeEmails);
}

export async function commitCsvImportRows({ supabase, profileId, filename, rows }: CsvImportParams) {
  const context = await getValidationContext(supabase);
  const validation = validateCsvRows(rows, context.existingJobNos, context.activeAssigneeEmails);
  const runtimeErrors: CsvValidationError[] = [];
  let insertedRows = 0;

  for (const row of validation.validRows) {
    const rowNumber = rowNumberForJobNo(rows, row.job_no);
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert({ customer_code: row.customer_code, name: row.customer_name }, { onConflict: "customer_code" })
      .select("id")
      .single<{ id: string }>();
    if (customerError || !customer) {
      runtimeErrors.push({
        rowNumber,
        fieldName: "customer_code",
        errorCode: "customer_upsert_failed",
        message: customerError?.message ?? "顧客を保存できませんでした",
        rowData: row
      });
      continue;
    }

    const { data: site, error: siteError } = await supabase
      .from("sites")
      .upsert(
        {
          customer_id: customer.id,
          name: row.site_name,
          postal_code: row.postal_code || null,
          address: row.address
        },
        { onConflict: "customer_id,name,address" }
      )
      .select("id")
      .single<{ id: string }>();
    if (siteError || !site) {
      runtimeErrors.push({
        rowNumber,
        fieldName: "site_name",
        errorCode: "site_upsert_failed",
        message: siteError?.message ?? "現場を保存できませんでした",
        rowData: row
      });
      continue;
    }

    const assigneeId = context.assigneeByEmail.get(row.assignee_email);
    if (!assigneeId) {
      runtimeErrors.push({
        rowNumber,
        fieldName: "assignee_email",
        errorCode: "unknown_assignee",
        message: "登録済みで有効な担当者メールではありません",
        rowData: row
      });
      continue;
    }

    const { error: jobError } = await supabase.from("inspection_jobs").insert({
      job_no: row.job_no,
      customer_id: customer.id,
      site_id: site.id,
      inspection_type: row.inspection_type,
      assignee_id: assigneeId,
      scheduled_date: row.scheduled_date,
      report_due_date: row.report_due_date,
      status: row.status,
      estimate_amount: row.estimate_amount === "" ? null : Number(row.estimate_amount),
      billing_status: row.billing_status,
      notes: row.notes,
      created_by: profileId,
      updated_by: profileId
    });
    if (jobError) {
      runtimeErrors.push({
        rowNumber,
        fieldName: "job_no",
        errorCode: jobError.code === "23505" ? "duplicate_in_database" : "job_insert_failed",
        message: jobError.code === "23505" ? "DB内に同じ案件番号があります" : jobError.message,
        rowData: row
      });
      continue;
    }

    insertedRows += 1;
  }

  const errors = [...validation.errors, ...runtimeErrors];
  const failedRows = countCsvFailedRows(errors);
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      filename,
      total_rows: validation.totalRows,
      success_rows: insertedRows,
      failed_rows: failedRows,
      imported_by: profileId
    })
    .select("id")
    .single<{ id: string }>();

  if (batchError || !batch) {
    throw new Error(batchError?.message ?? "取込バッチを作成できませんでした。");
  }

  if (errors.length > 0) {
    const { error: errorsInsertError } = await supabase.from("import_errors").insert(
      errors.map((error) => ({
        batch_id: batch.id,
        row_number: error.rowNumber,
        field_name: error.fieldName,
        error_code: error.errorCode,
        message: error.message,
        row_data: error.rowData
      }))
    );
    if (errorsInsertError) throw new Error(errorsInsertError.message);
  }

  return {
    batchId: batch.id,
    totalRows: validation.totalRows,
    successRows: insertedRows,
    failedRows,
    errorCount: errors.length,
    validRows: validation.validRows,
    errors
  };
}
