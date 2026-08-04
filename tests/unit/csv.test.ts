import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CSV_COLUMNS, parseCsv, sanitizeCsvCell, validateCsvRows, validateRequiredColumns } from "../../lib/csv.ts";

const validRow = {
  job_no: "MDS-CSV-0001",
  customer_code: "C001",
  customer_name: "架空設備株式会社",
  site_name: "第一現場",
  postal_code: "590-0001",
  address: "大阪府南大阪市架空町1-1-1",
  inspection_type: "消防設備点検",
  assignee_email: "staff@table-to-app.example",
  scheduled_date: "2026-08-10",
  report_due_date: "2026-08-12",
  status: "scheduled",
  estimate_amount: "10000",
  billing_status: "quoted",
  notes: "架空データ"
};

describe("CSV validation", () => {
  it("checks required columns", () => {
    assert.equal(validateRequiredColumns(CSV_COLUMNS as unknown as string[]).length, 0);
    assert.equal(validateRequiredColumns(["job_no"]).some((error) => error.fieldName === "customer_code" && error.errorCode === "missing_column"), true);
  });

  it("parses and accepts a valid row", () => {
    const result = validateCsvRows([validRow], new Set(), new Set(["staff@table-to-app.example"]));
    assert.equal(result.validRows.length, 1);
    assert.equal(result.errors.length, 0);
  });

  it("detects duplicate job_no inside file", () => {
    const result = validateCsvRows([validRow, validRow], new Set(), new Set(["staff@table-to-app.example"]));
    assert.equal(result.errors.some((error) => error.errorCode === "duplicate_in_file"), true);
  });

  it("detects invalid rows", () => {
    const result = validateCsvRows(
      [{ ...validRow, job_no: "", scheduled_date: "2026/08/10", report_due_date: "2026-08-01", status: "bad", estimate_amount: "-10" }],
      new Set(),
      new Set(["staff@table-to-app.example"])
    );
    assert.equal(result.errors.length > 0, true);
  });

  it("detects duplicate job_no in database", () => {
    const result = validateCsvRows([validRow], new Set(["MDS-CSV-0001"]), new Set(["staff@table-to-app.example"]));
    assert.equal(result.errors[0].errorCode, "duplicate_in_database");
  });

  it("detects unknown assignee", () => {
    const result = validateCsvRows([validRow], new Set(), new Set(["admin@table-to-app.example"]));
    assert.equal(result.errors[0].errorCode, "unknown_assignee");
  });

  it("guards CSV injection values", () => {
    assert.equal(sanitizeCsvCell("=cmd"), "'=cmd");
    assert.equal(sanitizeCsvCell("+SUM(A1:A2)"), "'+SUM(A1:A2)");
  });

  it("parses UTF-8 BOM CSV", () => {
    const text = `\uFEFF${CSV_COLUMNS.join(",")}\n${CSV_COLUMNS.map((column) => validRow[column]).join(",")}`;
    const parsed = parseCsv(text);
    assert.equal(parsed.meta.fields?.[0], "job_no");
    assert.equal(parsed.data.length, 1);
  });
});
