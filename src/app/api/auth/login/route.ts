import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase/server";
import { signToken } from "@/lib/auth/jwt";
import { setAuthCookie } from "@/lib/auth/authCookies";
import { authRole } from "@/lib/auth/authRole";
import { authUserByEmail } from "@/lib/auth/authUserByEmail";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const verifyRole = await authRole("admin");
    if (verifyRole instanceof NextResponse) return verifyRole;

    const user = await authUserByEmail(email);
    if (user instanceof NextResponse) return user

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
