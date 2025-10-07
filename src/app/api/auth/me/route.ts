import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/authUser";

export async function GET() {
  try {
    const user = await getAuthUser();
    // 3. Devolver payload del usuario
    return NextResponse.json({ user: user }, { status: 200 });
  } catch (err: any) {
    console.error("Me error:", err);

    return NextResponse.json(
      { error: "Token inválido o expirado" },
      { status: 401 }
    );
  }
}
