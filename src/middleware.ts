import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

if (
  pathname.includes("/api/auth/login") ||
  pathname.includes("/api/auth/register") ||
  pathname.includes("/api/auth/logout")
) {
  return NextResponse.next();
}


  // 2️⃣ Solo proteger rutas /api
  if (pathname.startsWith("/api")) {
    const token = request.cookies.get("token")?.value;

    // 3️⃣ Si no hay token
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
      // 4️⃣ Verificar token
      const { payload } = await jwtVerify(token, secret);

      // 5️⃣ Verificar expiración (extra)
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return NextResponse.json({ error: "Token expirado" }, { status: 401 });
      }

      // Si todo bien, continúa
      return NextResponse.next();

    } catch (err) {
      console.error("JWT inválido o expirado:", err);
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 401 }
      );
    }
  }

  // 6️⃣ Dejar pasar todo lo demás
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
