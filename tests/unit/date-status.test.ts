import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDueStatus } from "../../lib/date-status.ts";

describe("getDueStatus", () => {
  const today = new Date("2026-08-04T09:00:00+09:00");

  it("marks overdue jobs", () => {
    assert.equal(getDueStatus("2026-08-03", "scheduled", today), "overdue");
  });

  it("marks jobs due within seven days", () => {
    assert.equal(getDueStatus("2026-08-10", "in_progress", today), "due_soon");
  });

  it("marks normal future jobs", () => {
    assert.equal(getDueStatus("2026-08-20", "scheduled", today), "normal");
  });

  it("does not warn completed jobs", () => {
    assert.equal(getDueStatus("2026-08-01", "completed", today), "completed");
  });
});
