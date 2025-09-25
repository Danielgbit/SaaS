import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
  try {
    // 1. Leer cookie "token"
    const token = (await cookies()).get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // 2. Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    // 3. Devolver payload del usuario
    return NextResponse.json(
      { user: decoded },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Me error:", err);

    return NextResponse.json(
      { error: "Token inválido o expirado" },
      { status: 401 }
    );
  }
}
