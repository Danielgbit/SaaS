import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth/authCookies";

export async function POST() {
  try {
    clearAuthCookie();

    return NextResponse.json({ message: "Logout exitoso" }, { status: 200 });
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
