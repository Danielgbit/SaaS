// api/clients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/auth/jwt";
import { JWTPayload } from "@/types/auth";
import { resolveTenantId } from "@/lib/tenancy/resolveTenantId";
import { createClientSchema } from "@/lib/utils/validations/clients";

// ========== POST: Create Client ==========
export async function POST(req: NextRequest) {
  try {
    // 1) Resolver tenant
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID no encontrado" },
        { status: 401 }
      );
    }

    // 2) Verificar token (necesitamos saber quién hace la petición)
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken<JWTPayload>(token) : null;
    if (!decoded) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 3) Validar rol: por defecto permitimos solo 'admin' (global o del tenant)
    const { data: role, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("code, tenant_id")
      .eq("id", decoded.role_id)
      .single();

    if (roleErr || !role) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const allowedRoles = ["admin", "tenant_owner"];
    if (
      !(
        allowedRoles.includes(role.code) &&
        (role.tenant_id === null || role.tenant_id === tenantId)
      )
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 4) Validar body
    const body = await req.json();
    const payload = createClientSchema.parse(body);

    // 5) Insertar cliente
    const { data, error: insertError } = await supabaseAdmin
      .from("clients")
      .insert([
        {
          tenant_id: tenantId,
          name: payload.name,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          document_id: payload.document_id ?? null,
          birth_date: payload.birth_date ?? null,
          notes: payload.notes ?? null,
          is_active: payload.is_active ?? true,
          created_at: new Date().toISOString(),
        },
      ])
      .select("*")
      .single();

    if (insertError) {
      // Por ejemplo: unique constraint (tenant_id, email) puede fallar aquí
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // 6) Registrar auditoría (no hacemos fallar la creación si esto falla)
    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        tenant_id: tenantId,
        user_id: decoded.sub,
        action: "CREATE",
        resource: "clients",
        resource_id: data.id,
        payload: { name: data.name, email: data.email },
      });

    if (auditError) {
      return NextResponse.json(
        { error: "Error al registrar auditoría" },
        { status: 500 }
      );
    }

    // 7) Responder
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: err.errors ?? err.message },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// ========== GET: Listar clientes ==========
export async function GET(req: NextRequest) {
  try {
    // 1) Resolver tenant
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID no encontrado" },
        { status: 401 }
      );
    }

    // 2) Verificar token
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken<JWTPayload>(token) : null;
    if (!decoded) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 3) Validar rol
    const { data: role, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("code, tenant_id")
      .eq("id", decoded.role_id)
      .single();

    if (roleErr || !role) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const allowedRoles = ["admin", "tenant_owner"];
    if (
      !(
        allowedRoles.includes(role.code) &&
        (role.tenant_id === null || role.tenant_id === tenantId)
      )
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 4) Traer clientes del tenant
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5) Responder
    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
