import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export async function getCurrentUserAndProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at, updated_at")
    .eq("id", user.id)
    .single<Profile>();

  return { user, profile, supabase };
}

export async function requireProfile() {
  const context = await getCurrentUserAndProfile();
  if (!context.user || !context.profile || !context.profile.is_active) redirect("/login");
  return context as typeof context & { profile: Profile };
}

export async function requireRole(roles: Role[]) {
  const context = await requireProfile();
  if (!roles.includes(context.profile.role)) redirect("/jobs?error=forbidden");
  return context;
}

export function canEditAssignedJob(profile: Profile, assigneeId: string) {
  if (profile.role === "admin") return true;
  if (profile.role === "staff" && profile.id === assigneeId) return true;
  return false;
}
