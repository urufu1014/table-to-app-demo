import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { billingStatusLabels, statusLabels } from "@/lib/constants";
import { getDueStatus } from "@/lib/date-status";
import type { BillingStatus, JobStatus, JobWithRelations, Profile } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { DueBadge } from "@/components/due-badge";
import { EmptyState, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  assignee?: string;
  status?: JobStatus;
  due?: "overdue" | "due_soon" | "normal";
  billing?: BillingStatus;
  page?: string;
  error?: string;
};

export default async function JobsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { profile, supabase } = await requireProfile();
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("inspection_jobs")
    .select(
      "*, customers(*), sites(*), assignee:profiles!inspection_jobs_assignee_id_fkey(id, full_name, email)",
      { count: "exact" }
    )
    .order("report_due_date", { ascending: true });

  if (params.q) {
    query = query.or(`job_no.ilike.%${params.q}%,inspection_type.ilike.%${params.q}%,notes.ilike.%${params.q}%`);
  }
  if (params.assignee) query = query.eq("assignee_id", params.assignee);
  if (params.status) query = query.eq("status", params.status);
  if (params.billing) query = query.eq("billing_status", params.billing);

  const { data, count } = await query.range(from, to);
  const jobs = (data ?? []) as unknown as JobWithRelations[];

  const { data: allVisibleJobs } = await supabase
    .from("inspection_jobs")
    .select("id, report_due_date, status")
    .returns<Array<{ id: string; report_due_date: string; status: JobStatus }>>();
  const metricsSource = allVisibleJobs ?? [];
  const filteredByDue = params.due ? jobs.filter((job) => getDueStatus(job.report_due_date, job.status) === params.due) : jobs;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  const { data: assignees } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at, updated_at")
    .in("role", ["admin", "staff"])
    .eq("is_active", true)
    .returns<Profile[]>();

  const cards = [
    { label: "全案件数", value: metricsSource.length },
    { label: "期限超過", value: metricsSource.filter((job) => getDueStatus(job.report_due_date, job.status) === "overdue").length },
    { label: "7日以内", value: metricsSource.filter((job) => getDueStatus(job.report_due_date, job.status) === "due_soon").length },
    { label: "未完了", value: metricsSource.filter((job) => !["completed", "cancelled"].includes(job.status)).length }
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">案件一覧</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">期限、担当者、進捗、請求状況をまとめて確認します。</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/api/jobs/export?${new URLSearchParams(params as Record<string, string>).toString()}`} variant="secondary">
            <Download className="mr-2" size={16} />
            CSV出力
          </LinkButton>
          {profile.role !== "viewer" ? (
            <LinkButton href="/jobs/new">
              <Plus className="mr-2" size={16} />
              新規登録
            </LinkButton>
          ) : null}
        </div>
      </div>

      {params.error === "forbidden" ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">権限がありません。</p> : null}

      <section className="grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-md border border-[var(--line)] bg-white p-4">
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </section>

      <form className="grid gap-3 rounded-md border border-[var(--line)] bg-white p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
        <label className="grid gap-1 text-sm">
          キーワード
          <input name="q" defaultValue={params.q ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          担当者
          <select name="assignee" defaultValue={params.assignee ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3">
            <option value="">すべて</option>
            {(assignees ?? []).map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          進捗
          <select name="status" defaultValue={params.status ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3">
            <option value="">すべて</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          期限
          <select name="due" defaultValue={params.due ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3">
            <option value="">すべて</option>
            <option value="overdue">期限超過</option>
            <option value="due_soon">7日以内</option>
            <option value="normal">通常</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          請求
          <select name="billing" defaultValue={params.billing ?? ""} className="focus-ring min-h-10 rounded-md border border-[var(--line)] px-3">
            <option value="">すべて</option>
            {Object.entries(billingStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="focus-ring mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-4 text-sm font-semibold hover:bg-slate-50">
          <Search size={16} />
          検索
        </button>
      </form>

      {filteredByDue.length === 0 ? (
        <EmptyState title="該当する案件がありません" body="検索条件を変更するか、新規登録してください。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-3">案件番号</th>
                  <th className="px-3 py-3">顧客名</th>
                  <th className="px-3 py-3">現場名</th>
                  <th className="px-3 py-3">点検種別</th>
                  <th className="px-3 py-3">担当者</th>
                  <th className="px-3 py-3">予定日</th>
                  <th className="px-3 py-3">提出期限</th>
                  <th className="px-3 py-3">進捗</th>
                  <th className="px-3 py-3">請求</th>
                  <th className="px-3 py-3">最終更新</th>
                </tr>
              </thead>
              <tbody>
                {filteredByDue.map((job) => (
                  <tr key={job.id} className="border-t border-[var(--line)] align-top hover:bg-slate-50">
                    <td className="px-3 py-3 font-semibold">
                      <Link className="underline decoration-slate-300 underline-offset-4" href={`/jobs/${job.id}`}>
                        {job.job_no}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{job.customers?.name ?? "-"}</td>
                    <td className="px-3 py-3">{job.sites?.name ?? "-"}</td>
                    <td className="px-3 py-3">{job.inspection_type}</td>
                    <td className="px-3 py-3">{job.assignee?.full_name ?? "-"}</td>
                    <td className="px-3 py-3">{formatDate(job.scheduled_date)}</td>
                    <td className="px-3 py-3">
                      <div className="grid gap-1">
                        <span>{formatDate(job.report_due_date)}</span>
                        <DueBadge dueDate={job.report_due_date} status={job.status} />
                      </div>
                    </td>
                    <td className="px-3 py-3">{statusLabels[job.status]}</td>
                    <td className="px-3 py-3">{billingStatusLabels[job.billing_status]}</td>
                    <td className="px-3 py-3">{formatDate(job.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span>
          {page} / {totalPages} ページ
        </span>
        <div className="flex gap-2">
          {page > 1 ? <LinkButton href={`/jobs?${new URLSearchParams({ ...(params as Record<string, string>), page: String(page - 1) }).toString()}`} variant="secondary">前へ</LinkButton> : null}
          {page < totalPages ? <LinkButton href={`/jobs?${new URLSearchParams({ ...(params as Record<string, string>), page: String(page + 1) }).toString()}`} variant="secondary">次へ</LinkButton> : null}
        </div>
      </div>
    </div>
  );
}
