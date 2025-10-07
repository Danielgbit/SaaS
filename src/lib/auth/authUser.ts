import { NextResponse } from "next/server";
import { authTenant } from "./authTenant";
import { getAuthCookie } from "./authCookies";
import { AuthUserProps } from "@/types/auth";
import { verifyToken } from "./jwt";

export async function getAuthUser() {
  const token = await getAuthCookie();
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = verifyToken(token) as AuthUserProps;
  const tenant = await authTenant(payload.tenant_id as string);
  if (tenant instanceof NextResponse) return tenant;

  return payload;
}