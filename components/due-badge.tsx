import { dueStatusLabel, getDueStatus } from "@/lib/date-status";
import type { JobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DueBadge({ dueDate, status }: { dueDate: string; status: JobStatus }) {
  const dueStatus = getDueStatus(dueDate, status);
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded px-2 py-1 text-xs font-semibold",
        dueStatus === "overdue" && "bg-red-100 text-red-800",
        dueStatus === "due_soon" && "bg-amber-100 text-amber-800",
        dueStatus === "completed" && "bg-slate-100 text-slate-700",
        dueStatus === "normal" && "bg-emerald-50 text-emerald-800"
      )}
    >
      {dueStatusLabel(dueStatus)}
    </span>
  );
}
