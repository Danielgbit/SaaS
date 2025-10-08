import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ExistingUserProps } from "@/types/auth";

export async function authUserByEmail(email: string) {
  
  const { data: user, error } = await supabaseServer
    .from("users")
    .select("id, email, tenant_id, role_id, is_active")
    .eq("email", email)
    .single();


  if (error || !user) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 401 }
    );
  }

  if (!user.is_active) {
    return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
  }

  return user as ExistingUserProps;
}
