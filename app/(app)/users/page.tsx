import { updateProfileRoleAction } from "@/app/actions/users";
import { requireRole } from "@/lib/auth";
import { ROLES, roleLabels } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at, updated_at")
    .order("role")
    .returns<Profile[]>();

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">利用者・権限管理</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">管理者のみ、プロフィール情報と権限を変更できます。</p>
      </div>
      <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-3">氏名</th>
                <th className="px-3 py-3">メールアドレス</th>
                <th className="px-3 py-3">権限</th>
                <th className="px-3 py-3">状態</th>
                <th className="px-3 py-3">更新日</th>
                <th className="px-3 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((profile) => (
                <tr key={profile.id} className="border-t border-[var(--line)]">
                  <td className="px-3 py-3 font-semibold">{profile.full_name}</td>
                  <td className="px-3 py-3">{profile.email}</td>
                  <td className="px-3 py-3">{roleLabels[profile.role]}</td>
                  <td className="px-3 py-3">{profile.is_active ? "有効" : "停止"}</td>
                  <td className="px-3 py-3">{formatDate(profile.updated_at)}</td>
                  <td className="px-3 py-3">
                    <form action={updateProfileRoleAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={profile.id} />
                      <select name="role" defaultValue={profile.role} className="focus-ring min-h-9 rounded-md border border-[var(--line)] px-2">
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex items-center gap-1">
                        <input type="checkbox" name="is_active" defaultChecked={profile.is_active} />
                        有効
                      </label>
                      <button className="focus-ring rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white">更新</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
