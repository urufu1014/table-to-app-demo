"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogIn } from "lucide-react";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button, Field } from "@/components/ui";

const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  function selectDemoAccount(accountEmail: string) {
    setSelectedEmail(accountEmail);
    setEmail(accountEmail);
    setPassword(demoPassword);
    setError("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }
    router.replace("/jobs");
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <section aria-labelledby="demo-accounts-title" className="grid gap-3">
        <div>
          <h2 id="demo-accounts-title" className="text-sm font-bold text-slate-900">
            役割を選択
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">選ぶと、公開デモ用のログイン情報が自動入力されます。</p>
        </div>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="デモアカウントの役割">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => selectDemoAccount(account.email)}
              aria-pressed={selectedEmail === account.email}
              className="focus-ring min-h-11 rounded-md border border-[var(--line)] bg-white px-2 py-2 text-sm font-medium text-slate-800 transition hover:border-[var(--accent)] hover:bg-emerald-50 aria-pressed:border-[var(--accent)] aria-pressed:bg-emerald-50 aria-pressed:font-bold aria-pressed:text-[var(--accent-strong)]"
            >
              <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                {selectedEmail === account.email ? <Check size={15} aria-hidden="true" /> : null}
                {account.role}
              </span>
            </button>
          ))}
        </div>
        <div className="min-h-10" aria-live="polite">
          {selectedEmail ? (
            <p className="text-sm text-slate-700">{DEMO_ACCOUNTS.find((account) => account.email === selectedEmail)?.note}</p>
          ) : null}
          {selectedEmail ? <p className="mt-1 text-xs text-[var(--muted)]">公開デモ専用のアカウントです。</p> : null}
        </div>
      </section>

      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="メールアドレス">
          <input
            className="focus-ring min-h-11 rounded-md border border-[var(--line)] px-3"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setSelectedEmail("");
            }}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="パスワード">
          <input
            className="focus-ring min-h-11 rounded-md border border-[var(--line)] px-3"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setSelectedEmail("");
            }}
            required
            autoComplete="current-password"
          />
        </Field>
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}
        {!demoPassword ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            公開デモ用パスワードが未設定です。`.env` に `NEXT_PUBLIC_DEMO_PASSWORD` を設定してください。
          </p>
        ) : null}
        <Button
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          className="gap-2 disabled:bg-slate-200 disabled:text-slate-700 disabled:opacity-100 disabled:shadow-none disabled:hover:bg-slate-200"
        >
          <LogIn size={18} />
          {loading ? "確認中" : "ログイン"}
        </Button>
      </form>
    </div>
  );
}
