import { CheckCircle2, Database, FileSpreadsheet } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <section className="w-full max-w-5xl overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm md:grid md:grid-cols-[40fr_60fr]">
        <div className="flex bg-slate-900 p-6 text-white md:min-h-[620px] md:items-center md:p-10">
          <div className="w-full">
            <p className="text-sm font-semibold text-emerald-200">表をアプリに。</p>
            <h1 className="mt-4 text-2xl font-bold tracking-normal md:text-4xl">点検案件管理アプリ</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-100 md:text-base">
              Excel・スプレッドシートで管理していた点検案件を、複数人で安全に使えるWebアプリへ移行したデモです。
            </p>
            <div className="mt-5 rounded-md border border-slate-700 bg-slate-800/60 p-4 md:mt-8">
              <div className="grid justify-items-center gap-3 text-center text-slate-100">
                <div className="w-full rounded-md bg-slate-900/35 px-3 py-2">
                  <span className="inline-flex items-center justify-center gap-2 text-sm font-bold">
                    <FileSpreadsheet size={16} aria-hidden="true" />
                    表で管理
                  </span>
                  <span className="mt-1 block text-xs text-slate-300">Excel・Googleスプレッドシート</span>
                </div>
                <div className="flex items-center justify-center" aria-hidden="true">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-900/35 text-sm font-semibold text-slate-300">
                    ↓
                  </span>
                </div>
                <div className="w-full rounded-md bg-slate-900/35 px-3 py-2">
                  <span className="inline-flex items-center justify-center gap-2 text-sm font-bold">
                    <Database size={16} aria-hidden="true" />
                    点検案件管理アプリ
                  </span>
                </div>
              </div>
            </div>
            <ul className="mt-4 grid gap-3 text-sm text-slate-100 md:mt-6">
              {["二重登録を防ぐ", "期限を見える化", "人ごとに操作権限を分ける"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-emerald-200" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-md text-xs leading-6 text-slate-300 md:mt-8">
              架空データを使った模擬納品であり、実在企業への納品実績ではありません。
            </p>
          </div>
        </div>
        <div className="flex items-center p-6 md:p-10">
          <div className="w-full">
            <h2 className="text-2xl font-bold">ログイン</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">役割を選ぶか、メールアドレスとパスワードを入力してください。</p>
            <div className="mt-6">
            <LoginForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
