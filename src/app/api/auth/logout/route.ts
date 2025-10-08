import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth/authCookies";

export async function POST() {
  try {
    const res = NextResponse.json({ message: "Logout exitoso" }, { status: 200 });
    await clearAuthCookie(res);
    return res;
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
