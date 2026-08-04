import Link from "next/link";
import { Edit } from "lucide-react";
import { DueBadge } from "@/components/due-badge";
import { LinkButton } from "@/components/ui";
import { canEditAssignedJob, requireProfile } from "@/lib/auth";
import { billingStatusLabels, statusLabels } from "@/lib/constants";
import type { JobHistoryItem, JobWithRelations } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();
  const { data } = await supabase
    .from("inspection_jobs")
    .select(
      "*, customers(*), sites(*), assignee:profiles!inspection_jobs_assignee_id_fkey(id, full_name, email), creator:profiles!inspection_jobs_created_by_fkey(id, full_name), updater:profiles!inspection_jobs_updated_by_fkey(id, full_name)"
    )
    .eq("id", id)
    .single();
  const job = data as unknown as JobWithRelations | null;

  if (!job) {
    return <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">案件が見つからないか、閲覧権限がありません。</p>;
  }

  const { data: histories } = await supabase
    .from("job_history")
    .select("id, job_id, actor_id, action, changed_fields, created_at, actor:profiles!job_history_actor_id_fkey(full_name, email)")
    .eq("job_id", id)
    .order("created_at", { ascending: false });

  const canEdit = canEditAssignedJob(profile, job.assignee_id);

  return (
    <div className="grid gap-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/jobs" className="text-sm text-[var(--muted)] underline underline-offset-4">
            案件一覧へ戻る
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{job.job_no}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{job.customers?.name} / {job.sites?.name}</p>
        </div>
        {canEdit ? (
          <LinkButton href={`/jobs/${job.id}/edit`}>
            <Edit className="mr-2" size={16} />
            編集
          </LinkButton>
        ) : null}
      </div>

      <section className="grid min-w-0 gap-4 rounded-md border border-[var(--line)] bg-white p-5 md:grid-cols-3">
        <Info label="顧客名" value={job.customers?.name} />
        <Info label="現場名" value={job.sites?.name} />
        <Info label="現場住所" value={job.sites?.address} />
        <Info label="点検種別" value={job.inspection_type} />
        <Info label="担当者" value={`${job.assignee?.full_name ?? "-"} / ${job.assignee?.email ?? "-"}`} />
        <Info label="点検予定日" value={formatDate(job.scheduled_date)} />
        <Info label="報告書提出期限" value={<span className="inline-flex items-center gap-2">{formatDate(job.report_due_date)} <DueBadge dueDate={job.report_due_date} status={job.status} /></span>} />
        <Info label="進捗" value={statusLabels[job.status]} />
        <Info label="見積金額" value={formatCurrency(job.estimate_amount)} />
        <Info label="請求状況" value={billingStatusLabels[job.billing_status]} />
        <Info label="作成者・作成日時" value={`${job.creator?.full_name ?? "-"} / ${formatDate(job.created_at)}`} />
        <Info label="更新者・更新日時" value={`${job.updater?.full_name ?? "-"} / ${formatDate(job.updated_at)}`} />
        <div className="md:col-span-3">
          <p className="text-xs font-semibold text-[var(--muted)]">備考</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{job.notes || "-"}</p>
        </div>
      </section>

      <section className="min-w-0 rounded-md border border-[var(--line)] bg-white p-5">
        <h2 className="text-lg font-bold">更新履歴</h2>
        <div className="mt-4 grid min-w-0 gap-3">
          {((histories ?? []) as unknown as JobHistoryItem[]).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">履歴はまだありません。</p>
          ) : (
            ((histories ?? []) as unknown as JobHistoryItem[]).map((history) => (
              <div key={history.id} className="min-w-0 rounded-md border border-[var(--line)] p-3">
                <p className="break-words text-sm font-semibold">
                  {history.action} / {history.actor?.full_name ?? "-"} / {formatDate(history.created_at)}
                </p>
                <pre className="mt-2 max-w-full overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(history.changed_fields, null, 2)}</pre>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-1 break-words text-sm">{value || "-"}</p>
    </div>
  );
}
