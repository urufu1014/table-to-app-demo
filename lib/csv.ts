import Papa from "papaparse";
import { z } from "zod";
import { BILLING_STATUSES, JOB_STATUSES } from "./constants.ts";

export const CSV_COLUMNS = [
  "job_no",
  "customer_code",
  "customer_name",
  "site_name",
  "postal_code",
  "address",
  "inspection_type",
  "assignee_email",
  "scheduled_date",
  "report_due_date",
  "status",
  "estimate_amount",
  "billing_status",
  "notes"
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];
export type CsvRow = Record<CsvColumn, string>;

export type CsvValidationError = {
  rowNumber: number;
  fieldName: string | null;
  errorCode: string;
  message: string;
  rowData: Record<string, string>;
};

export type CsvValidationResult = {
  totalRows: number;
  validRows: CsvRow[];
  errors: CsvValidationError[];
  failedRowCount: number;
  errorCount: number;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const csvRowSchema = z
  .object({
    job_no: z.string().trim().min(1, "案件番号は必須です"),
    customer_code: z.string().trim().min(1, "顧客コードは必須です"),
    customer_name: z.string().trim().min(1, "顧客名は必須です"),
    site_name: z.string().trim().min(1, "現場名は必須です"),
    postal_code: z.string(),
    address: z.string().trim().min(1, "住所は必須です"),
    inspection_type: z.string().trim().min(1, "点検種別は必須です"),
    assignee_email: z.string().email("担当者メールが不正です"),
    scheduled_date: z.string().regex(datePattern, "点検予定日は YYYY-MM-DD で入力してください"),
    report_due_date: z.string().regex(datePattern, "提出期限は YYYY-MM-DD で入力してください"),
    status: z.enum(JOB_STATUSES, { error: "進捗が許可値ではありません" }),
    estimate_amount: z.string().refine((value) => value === "" || Number(value) >= 0, "見積金額は0以上です"),
    billing_status: z.enum(BILLING_STATUSES, { error: "請求状況が許可値ではありません" }),
    notes: z.string()
  })
  .refine((value) => value.report_due_date >= value.scheduled_date, {
    message: "提出期限が点検予定日より前です",
    path: ["report_due_date"]
  });

export function sanitizeCsvCell(value: unknown) {
  const text = String(value ?? "");
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export function parseCsv(text: string) {
  return Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim()
  });
}

export function validateRequiredColumns(fields: string[] | undefined): CsvValidationError[] {
  const actual = new Set(fields ?? []);
  return CSV_COLUMNS.filter((column) => !actual.has(column)).map((column) => ({
    rowNumber: 0,
    fieldName: column,
    errorCode: "missing_column",
    message: `必須列 ${column} がありません`,
    rowData: {}
  }));
}

export function validateCsvRows(
  rows: Record<string, string>[],
  existingJobNos: Set<string> = new Set(),
  activeAssigneeEmails: Set<string> = new Set()
): CsvValidationResult {
  const errors: CsvValidationError[] = [];
  const validRows: CsvRow[] = [];
  const seenJobNos = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const parsed = csvRowSchema.safeParse(row);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        errors.push({
          rowNumber,
          fieldName: String(issue.path[0] ?? ""),
          errorCode: "invalid_value",
          message: issue.message,
          rowData: row
        });
      });
      return;
    }

    const jobNo = parsed.data.job_no;
    const duplicateLine = seenJobNos.get(jobNo);
    if (duplicateLine) {
      errors.push({
        rowNumber,
        fieldName: "job_no",
        errorCode: "duplicate_in_file",
        message: `同じCSV内で案件番号が重複しています。先の行: ${duplicateLine}`,
        rowData: row
      });
      return;
    }
    seenJobNos.set(jobNo, rowNumber);

    if (existingJobNos.has(jobNo)) {
      errors.push({
        rowNumber,
        fieldName: "job_no",
        errorCode: "duplicate_in_database",
        message: "DB内に同じ案件番号があります",
        rowData: row
      });
      return;
    }

    if (activeAssigneeEmails.size > 0 && !activeAssigneeEmails.has(parsed.data.assignee_email)) {
      errors.push({
        rowNumber,
        fieldName: "assignee_email",
        errorCode: "unknown_assignee",
        message: "登録済みで有効な担当者メールではありません",
        rowData: row
      });
      return;
    }

    validRows.push(parsed.data);
  });

  return { totalRows: rows.length, validRows, errors, failedRowCount: countCsvFailedRows(errors), errorCount: errors.length };
}

export function countCsvFailedRows(errors: CsvValidationError[]) {
  return new Set(errors.filter((error) => error.rowNumber > 0).map((error) => error.rowNumber)).size;
}

export function toCsv(rows: Record<string, unknown>[]) {
  return Papa.unparse(rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, sanitizeCsvCell(value)]))));
}
