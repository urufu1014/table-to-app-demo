"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import type { Role } from "@/lib/types";

export async function updateProfileRoleAction(formData: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const isActive = formData.get("is_active") === "on";
  if (!id || !ROLES.includes(role)) return;

  await supabase.from("profiles").update({ role, is_active: isActive }).eq("id", id);
  revalidatePath("/users");
}
