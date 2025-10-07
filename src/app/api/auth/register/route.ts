import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { authUserByEmail } from "@/lib/auth/authUserByEmail";

export async function POST(req: Request) {
  try {
    const { email, password, name, phone, tenant_id, role_id } =
      await req.json();

    // 1. Validar campos requeridos
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    await authUserByEmail(email);

    // 3. Hashear la contraseña
    const { data: authData, error: errorSignUp } =
      await supabaseServer.auth.signUp({
        email: email,
        password: password,
      });

    if (errorSignUp || !authData.user) {
      return NextResponse.json(
        { error: "Error al registrar usuario" },
        { status: 500 }
      );
    }

    // 4. Crear usuario en la BD
    const { data: newUser, error } = await supabaseServer
      .from("users")
      .insert([
        {
          email,
          name: name || null,
          phone: phone || null,
          tenant_id: tenant_id || null,
          role_id: role_id || null,
          is_active: true,
        },
      ])
      .select("id, email, tenant_id, role_id, name, phone")
      .single();

    if (error) {
      console.error("Error creando usuario:", error);
      return NextResponse.json(
        { error: "Error al registrar usuario" },
        { status: 500 }
      );
    }

    // 5. Responder con éxito (sin devolver el password_hash)
    return NextResponse.json(
      { message: "Usuario registrado con éxito", user: newUser },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
