import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // Eliminar la cookie "token"
    (await cookies()).set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0), // expira inmediatamente
    });

    return NextResponse.json(
      { message: "Logout exitoso" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
