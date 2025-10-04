// lib/withTenant.ts
import { NextRequest, NextResponse } from "next/server"

/* import { resolveTenantId } from "./resolveTenantId" */

export function withTenant(
  handler: (req: NextRequest, tenantId: string) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const tenantId = req.headers.get("x-tenant-id");
    
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId requerido" },
        { status: 400 }
      )
    }
    return handler(req, tenantId)
  }
}
