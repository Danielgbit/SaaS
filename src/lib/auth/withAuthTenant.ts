import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { JWTPayload } from "@/types/auth";

type Params = { params: Promise<{ [key: string]: string }> };

export function withAuthTenant(
  handler: (req: NextRequest, context: Params, tenantId: string, user: JWTPayload) => Promise<Response>
) {
  return async (req: NextRequest, context: Params) => {
    const tenantId = req.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId requerido" }, { status: 400 });
    }

    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken<JWTPayload>(token) : null;
    if (!decoded) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    return handler(req, context, tenantId, decoded);
  };
}