import { NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "../supabase/server";

export async function authTenant(tenantId: string) {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, is_active")
    .eq("id", tenantId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No autorizado: tenant no encontrado" },
      { status: 401 }
    );
  }

  if (!data.is_active) {
    return NextResponse.json(
      { error: "No autorizado: tenant inactivo" },
      { status: 401 }
    );
  }

  return data;
}
