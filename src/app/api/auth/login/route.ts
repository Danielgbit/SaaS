import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase/server";
import { signToken } from "@/lib/auth/jwt";
import { setAuthCookie } from "@/lib/auth/cookies";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Buscar usuario en la tabla `users`
    const { data: user, error } = await supabaseServer
      .from("users")
      .select("id, email, password_hash, tenant_id, role_id, is_active")
      .eq("email", email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      );
    }

    const { data: userRoles, error: rolesError } = await supabaseServer
      .from("user_roles")
      .select("code")
      .eq("id", user.role_id)
      .single();

    if (rolesError) {
      return NextResponse.json({
        message: "Error al obtener roles de usuario",
        status: 404,
      });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    }
    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Crear payload del JWT
    const payload = {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      role_id: user.role_id,
      role: userRoles?.code || null,
    };

    //Firmar y crear el token
    const token = signToken(payload);

    await setAuthCookie(token);

    return NextResponse.json({ message: "Login exitoso", user: payload });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
