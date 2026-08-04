import { requireRole } from "@/lib/auth";
import { CsvImportClient } from "./csv-import-client";

export const dynamic = "force-dynamic";

export default async function CsvImportPage() {
  await requireRole(["admin"]);
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">CSV移行</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">正常行だけを明示的な確認後に取り込み、エラー行は取り込まず一覧で返します。</p>
      </div>
      <CsvImportClient />
    </div>
  );
}
