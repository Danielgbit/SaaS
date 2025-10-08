import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth/jwt";
import { setAuthCookie } from "@/lib/auth/authCookies";
import { authUserByEmail } from "@/lib/auth/authUserByEmail";
import { supabaseServer } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/utils/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    
    // 2️⃣ Validar datos con Zod
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parseResult.error },
        { status: 400 }
      );
    }
    
    const { email, password } = parseResult.data;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const user = await authUserByEmail(email);
    if (user instanceof NextResponse) return user;

    // Verificar contraseña
    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email: email,
      password: password,
    });


    if (error || !data.session) {
      return NextResponse.json(
        { error: "Confirma tu email" },
        { status: 401 }
      );
    }

    // Crear payload del JWT
    const payload = {
      id: user.id,
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
