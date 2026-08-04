import type { JobStatus } from "@/lib/types";

export type DueStatus = "completed" | "overdue" | "due_soon" | "normal";

export function getDueStatus(reportDueDate: string, status: JobStatus, today = new Date()): DueStatus {
  if (["completed", "cancelled"].includes(status)) return "completed";
  const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const dueDate = new Date(`${reportDueDate}T00:00:00Z`);
  const diffDays = Math.floor((dueDate.getTime() - todayDate.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "due_soon";
  return "normal";
}

export function dueStatusLabel(status: DueStatus) {
  return {
    completed: "完了・対象外",
    overdue: "期限超過",
    due_soon: "7日以内",
    normal: "通常"
  }[status];
}
