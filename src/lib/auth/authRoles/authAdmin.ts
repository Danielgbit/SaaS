// lib/auth/authAdmin.ts
import { NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUser } from "../authUser";

/**
 * Verifica si el usuario autenticado tiene el rol "admin".
 * Si no es admin, devuelve un NextResponse 403.
 * Si sí lo es, devuelve los datos del usuario.
 */
export async function authAdmin() {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user; // Si no hay token o inválido

  const { data: role, error } = await supabaseAdmin
    .from("user_roles")
    .select("code")
    .eq("id", user.role_id)
    .single();

  if (error || !role) {
    return NextResponse.json({ error: "Rol no encontrado" }, { status: 403 });
  }

  if (role.code !== "admin") {
    return NextResponse.json(
      { error: "No autorizado: solo administradores pueden acceder." },
      { status: 403 }
    );
  }

  return user;
}
