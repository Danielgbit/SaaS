// lib/tenancy/resolveTenantId.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth/jwt";

const uuid = z.string().uuid();

export function resolveTenantId(req: NextRequest): string | undefined {
  // 1. Revisar cookie JWT
  const token = req.cookies.get("token")?.value;
  if (token) {
    const payload = verifyToken<{ tenant_id: string }>(token);
    if (payload && uuid.safeParse(payload.tenant_id).success) {
      return payload.tenant_id;
    }
  }

  // 2. Revisar query param
  const url = new URL(req.url);
  const param = url.searchParams.get("tenantId")?.trim();
  if (param && uuid.safeParse(param).success) {
    return param;
  }

  // 3. Revisar header
  const header = req.headers.get("x-tenant-id")?.trim();
  if (header && uuid.safeParse(header).success) {
    return header;
  }

  // 4. Nada válido
  return undefined;
}
