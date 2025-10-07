// lib/auth/requireRole.ts
import { NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUser } from "./authUser";
import { RoleCodeProps } from "@/types/auth";

export async function authRole(requiredRole: RoleCodeProps) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const { data: role, error } = await supabaseAdmin
    .from("user_roles")
    .select("code")
    .eq("id", user.role_id)
    .or(`tenant_id.eq.${user.tenant_id},tenant_id.is.null`)
    .single();

  if (error || !role) {
    return NextResponse.json({ error: "Rol no encontrado" }, { status: 403 });
  }

  if (role.code !== requiredRole) {
    return NextResponse.json(
      { error: "No autorizado: rol insuficiente" },
      { status: 403 }
    );
  }

  return user; // ✅ Devuelve el usuario si todo bien
}
