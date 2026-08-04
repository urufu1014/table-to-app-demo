import Link from "next/link";
import { ClipboardList, FileUp, LogOut, Users } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { requireProfile } from "@/lib/auth";
import { roleLabels } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/jobs" className="font-bold">
            点検案件管理アプリ
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link className="focus-ring inline-flex items-center gap-1 rounded-md px-3 py-2 hover:bg-slate-100" href="/jobs">
              <ClipboardList size={16} />
              案件
            </Link>
            {profile.role === "admin" ? (
              <>
                <Link className="focus-ring inline-flex items-center gap-1 rounded-md px-3 py-2 hover:bg-slate-100" href="/csv-import">
                  <FileUp size={16} />
                  CSV
                </Link>
                <Link className="focus-ring inline-flex items-center gap-1 rounded-md px-3 py-2 hover:bg-slate-100" href="/users">
                  <Users size={16} />
                  利用者
                </Link>
              </>
            ) : null}
            <span className="rounded-md bg-slate-100 px-3 py-2 text-slate-700">
              {profile.full_name} / {roleLabels[profile.role]}
            </span>
            <form action={signOutAction}>
              <button className="focus-ring inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-3 py-2 hover:bg-slate-100">
                <LogOut size={16} />
                ログアウト
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
