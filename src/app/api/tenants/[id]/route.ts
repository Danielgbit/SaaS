// app/api/tenants/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/auth/jwt";
import { JWTPayload } from "@/types/auth";
import { updateTenantSchema } from "@/lib/utils/validations/tenants"; // 🔹 define el schema con zod

// ========== PUT ==========
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1) Extraer tenantId a actualizar
    const { id } = await context.params;

    // 2) Validar token
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken<JWTPayload>(token) : null;
    if (!decoded) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 3) Validar rol (superadmin global)
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("code")
      .eq("id", decoded.role_id)
      .is("tenant_id", null) // 🔹 rol global
      .single();

    if (!role || role.code !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 4) Validar body
    const body = await req.json();
    const payload = updateTenantSchema.parse(body);

    // 5) Verificar existencia del tenant
    const { data: existingTenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingTenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    // 6) Actualizar tenant
    const { data, error: updateError } = await supabaseAdmin
      .from("tenants")
      .update({
        name: payload.name ?? undefined,
        subdomain: payload.subdomain ?? undefined,
        domain: payload.domain ?? undefined,
        description: payload.description ?? undefined,
        plan: payload.plan ?? undefined,
        is_active:
          payload.is_active !== undefined ? payload.is_active : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Error al actualizar tenant" },
        { status: 500 }
      );
    }

    // 7) Log de auditoría
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: id,
      user_id: decoded.sub,
      action: "UPDATE",
      resource: "tenants",
      resource_id: id,
      payload,
    });

    // 8) Responder
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// ========== DELETE ==========
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1) Extraer id del tenant
    const { id } = await context.params;

    // 2) Validar token
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken<JWTPayload>(token) : null;
    if (!decoded) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 3) Validar que sea superadmin global
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("code")
      .eq("id", decoded.role_id)
      .is("tenant_id", null) // rol global
      .single();

    if (!role || role.code !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 4) Verificar que el tenant exista
    const { data: existingTenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name")
      .eq("id", id)
      .single();

    if (!existingTenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    // 5) Eliminar tenant (con cascada por FKs)
    const { error } = await supabaseAdmin.from("tenants").delete().eq("id", id);

    if (error) throw error;

    // 6) Registrar en logs
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: id,
      user_id: decoded.sub,
      action: "DELETE",
      resource: "tenants",
      resource_id: id,
      payload: {
        deleted_tenant: existingTenant,
        deleted_by: decoded.email,
        deleted_at: new Date().toISOString(),
      },
    });

    // 7) Responder
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// ========== GET: Get Tenant by ID ==========

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1) Validar token
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken<JWTPayload>(token) : null;
    if (!decoded) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2) Validar rol superadmin global
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("code")
      .eq("id", decoded.role_id)
      .is("tenant_id", null) // rol global
      .single();

    if (!role || role.code !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 3) Extraer id
    const { id } = await context.params;

    // 4) Buscar tenant
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    // 5) Responder
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
