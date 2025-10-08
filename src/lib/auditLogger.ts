// src/lib/auditLogger.ts
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { AuditLogProps } from "@/types/audit";
import { NextResponse } from "next/server";

export async function logAudit(params: AuditLogProps) {
  const { tenant_id, user_id = null, action, resource, resource_id, payload } = params;

  const { error } = await supabaseAdmin.from("audit_logs").insert({
    tenant_id,
    user_id,
    action,
    resource,
    resource_id,
    payload: {
        ...payload
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Error al registrar log de auditoría" },
      { status: 500 }
    );
  }
}
