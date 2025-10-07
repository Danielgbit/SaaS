import { NextResponse } from "next/server";
import { authTenant } from "./authTenant";
import { getAuthCookie } from "./authCookies";
import { decodeJwt } from "jose";
import { AuthUserProps } from "@/types/auth";

export async function getAuthUser() {
  const token = await getAuthCookie();
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = decodeJwt(token) as AuthUserProps;
  const tenant = await authTenant(payload.tenant_id as string);
  if (tenant instanceof NextResponse) return tenant;

  return payload;
}
