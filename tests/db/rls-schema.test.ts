import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const sql = readFileSync("supabase/migrations/202608040001_initial_schema.sql", "utf8");

describe("database schema and RLS migration", () => {
  it("creates the required seven application tables", () => {
    for (const table of ["profiles", "customers", "sites", "inspection_jobs", "job_history", "import_batches", "import_errors"]) {
      assert.equal(sql.includes(`create table public.${table}`), true);
    }
  });

  it("enables RLS on protected tables", () => {
    for (const table of ["profiles", "customers", "sites", "inspection_jobs", "job_history", "import_batches", "import_errors"]) {
      assert.equal(sql.includes(`alter table public.${table} enable row level security`), true);
    }
  });

  it("contains role policies for admin, staff, and viewer job access", () => {
    assert.equal(sql.includes("public.current_profile_role() = 'viewer'"), true);
    assert.equal(sql.includes("public.is_staff() and assignee_id = auth.uid()"), true);
    assert.equal(sql.includes("public.is_admin()"), true);
  });

  it("contains DB constraints for duplicate job numbers, dates, and amounts", () => {
    assert.equal(sql.includes("job_no text unique not null"), true);
    assert.equal(sql.includes("inspection_jobs_due_after_schedule"), true);
    assert.equal(sql.includes("inspection_jobs_estimate_non_negative"), true);
  });
});
