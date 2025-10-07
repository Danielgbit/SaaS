import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // PASO 1: Si es login/register/logout, dejamos pasar sin verificar token
  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.next();
  }

  // PASO 2: Solo verificamos tokens en rutas que empiecen con /api
  if (pathname.startsWith("/api")) {
    // PASO 3: Buscar el token en las cookies
    const token = request.cookies.get("token")?.value;

    // PASO 4: Si no hay token, bloqueamos
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // PASO 5: Verificar si el token es válido
    try {
      const { payload } = await jwtVerify(token, secret);

      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return NextResponse.json({ error: "Token expirado" }, { status: 401 });
      }
      
    } catch (err) {
      // Si es inválido, bloqueamos
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 401 }
      );
    }
  }

  // PASO 6: Dejar pasar a la ruta solicitada
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
