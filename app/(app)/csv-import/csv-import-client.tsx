"use client";

import { useState } from "react";
import { CheckCircle2, FileUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { CSV_COLUMNS, countCsvFailedRows, parseCsv, validateRequiredColumns } from "@/lib/csv";
import { useCsvImportStore } from "@/lib/stores/csv-import-store";

export function CsvImportClient() {
  const store = useCsvImportStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFile(file: File) {
    setMessage("");
    const text = await file.text();
    const parsed = parseCsv(text);
    const columnErrors = validateRequiredColumns(parsed.meta.fields);
    if (columnErrors.length > 0) {
      store.setFile(file.name, parsed.data);
      store.setValidation([], columnErrors);
      return;
    }
    store.setFile(file.name, parsed.data);
    setLoading(true);
    const response = await fetch("/api/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: parsed.data })
    });
    const payload = await response.json();
    setLoading(false);
    store.setValidation(payload.validRows ?? [], payload.errors ?? []);
  }

  async function commit() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: store.fileName, rows: store.parsedRows })
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.message ?? "取込に失敗しました。");
      return;
    }
    store.setResult(payload);
  }

  return (
    <div className="grid gap-5">
      <StepHeader step={store.step} />
      {store.step === 1 ? (
        <label className="grid cursor-pointer place-items-center gap-3 rounded-md border border-dashed border-[var(--line)] bg-white p-10 text-center">
          <FileUp size={36} />
          <span className="font-semibold">CSVファイルを選択</span>
          <span className="text-sm text-[var(--muted)]">{CSV_COLUMNS.join(", ")}</span>
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>
      ) : null}

      {store.step === 2 ? (
        <section className="grid gap-4 rounded-md border border-[var(--line)] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">プレビューと検証</h2>
              <p className="text-sm text-[var(--muted)]">{store.fileName}</p>
            </div>
            <Button disabled={loading} onClick={() => store.setStep(3)}>
              取込確認へ
            </Button>
          </div>
          <Summary total={store.parsedRows.length} valid={store.validRows.length} failed={countCsvFailedRows(store.errorRows)} errorCount={store.errorRows.length} />
          {loading ? <p className="text-sm">検証中です。</p> : null}
          <ErrorTable errors={store.errorRows} />
          <PreviewTable rows={store.validRows.slice(0, 8)} />
        </section>
      ) : null}

      {store.step === 3 ? (
        <section className="grid gap-4 rounded-md border border-[var(--line)] bg-white p-5">
          <h2 className="text-lg font-bold">取込確認</h2>
          <Summary total={store.parsedRows.length} valid={store.validRows.length} failed={countCsvFailedRows(store.errorRows)} errorCount={store.errorRows.length} />
          <p className="text-sm text-[var(--muted)]">正常行だけを取り込みます。エラー行は取り込まず、結果に記録します。</p>
          {message ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">{message}</p> : null}
          <div className="flex gap-2">
            <Button disabled={loading || store.validRows.length === 0} onClick={commit}>
              {loading ? "取込中" : "正常行を取り込む"}
            </Button>
            <button className="focus-ring rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold" onClick={() => store.setStep(2)}>
              戻る
            </button>
          </div>
        </section>
      ) : null}

      {store.step === 4 && store.result ? (
        <section className="grid gap-4 rounded-md border border-[var(--line)] bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <CheckCircle2 size={20} />
            取込結果
          </h2>
          <Summary total={store.result.totalRows} valid={store.result.successRows} failed={store.result.failedRows} errorCount={store.result.errorCount} />
          <p className="text-sm text-[var(--muted)]">取込バッチID: {store.result.batchId}</p>
          <Button className="gap-2" onClick={store.reset}>
            <RotateCcw size={16} />
            別のCSVを取り込む
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function StepHeader({ step }: { step: number }) {
  const labels = ["ファイル選択", "プレビューと検証", "取込確認", "結果表示"];
  return (
    <ol className="grid gap-2 md:grid-cols-4">
      {labels.map((label, index) => (
        <li key={label} className={`rounded-md border px-3 py-2 text-sm ${step === index + 1 ? "border-[var(--accent)] bg-emerald-50 font-semibold" : "border-[var(--line)] bg-white"}`}>
          {index + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

function Summary({ total, valid, failed, errorCount }: { total: number; valid: number; failed: number; errorCount: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="rounded-md bg-slate-100 p-3 text-sm">総行数: <b>{total}</b></div>
      <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">正常行: <b>{valid}</b></div>
      <div className="rounded-md bg-red-50 p-3 text-sm text-red-900">失敗行: <b>{failed}</b></div>
      <div className="rounded-md bg-red-50 p-3 text-sm text-red-900">エラー件数: <b>{errorCount}</b></div>
    </div>
  );
}

function ErrorTable({ errors }: { errors: ReturnType<typeof useCsvImportStore.getState>["errorRows"] }) {
  if (errors.length === 0) return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">エラーはありません。</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-red-50 text-left">
          <tr>
            <th className="px-3 py-2">行番号</th>
            <th className="px-3 py-2">列</th>
            <th className="px-3 py-2">理由</th>
            <th className="px-3 py-2">コード</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((error, index) => (
            <tr key={`${error.rowNumber}-${error.fieldName}-${index}`} className="border-t border-[var(--line)]">
              <td className="px-3 py-2">{error.rowNumber}</td>
              <td className="px-3 py-2">{error.fieldName ?? "-"}</td>
              <td className="px-3 py-2">{error.message}</td>
              <td className="px-3 py-2">{error.errorCode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewTable({ rows }: { rows: Record<string, string>[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-xs">
        <thead className="bg-slate-100 text-left">
          <tr>{CSV_COLUMNS.map((column) => <th key={column} className="px-2 py-2">{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-[var(--line)]">
              {CSV_COLUMNS.map((column) => <td key={column} className="max-w-48 truncate px-2 py-2">{row[column]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
