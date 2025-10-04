import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, JWTPayload } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Excluir login/register/logout
  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.next();
  }

  // Solo protegemos /api/*
  if (pathname.startsWith("/api")) {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No autorizado: falta el token" },
        { status: 401 }
      );
    }

    try {
      const { payload }: { payload: JWTPayload } = await jwtVerify(token, secret);

      const userId = payload.sub as string | undefined;
      const roleId = payload["role_id"] as string | undefined;

      // 🚀 Inyectamos los valores al request mediante headers
      const res = NextResponse.next();
      if (userId) res.headers.set("x-user-id", userId);
      if (roleId) res.headers.set("x-role-id", roleId);

      return res;
    } catch (err) {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
