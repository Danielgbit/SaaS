// app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/auth/jwt";
import { JWTPayload } from "@/types/auth";
import { resolveTenantId } from "@/lib/tenancy/resolveTenantId";
import { updateClientSchema } from "@/lib/utils/validations/clients";
import { headers } from "next/headers";

// ========== GET: Obtener cliente por ID ==========
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

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
    const isAllowed =
      allowedRoles.includes(role.code) &&
      (role.tenant_id === null || role.tenant_id === tenantId);

    if (!isAllowed) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 4) Traer cliente específico
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", clientId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
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

// ========== PUT: Actualizar cliente ==========
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const clientId = id;

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
    const isAllowed =
      allowedRoles.includes(role.code) &&
      (role.tenant_id === null || role.tenant_id === tenantId);

    if (!isAllowed) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 4) Validar body
    const body = await req.json();
    const payload = updateClientSchema.parse(body);

    // 5) Actualizar cliente
    const { data, error } = await supabaseAdmin
      .from("clients")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", clientId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Error al actualizar cliente" },
        { status: 500 }
      );
    }

    // 6) Responder
    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// ========== DELETE: Eliminar cliente ==========
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const clientId = id;
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

    // 3) Validar rol (solo admin o receptionist deberían poder eliminar)
    const { data: role, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("code, tenant_id")
      .eq("id", decoded.role_id)
      .single();

    if (roleErr || !role) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const allowedRoles = ["admin", "receptionist"];
    const isAllowed =
      allowedRoles.includes(role.code) &&
      (role.tenant_id === null || role.tenant_id === tenantId);

    if (!isAllowed) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 4) Eliminar cliente
    const { error } = await supabaseAdmin
      .from("clients")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", clientId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5) Respuesta
    return NextResponse.json(
      { message: "Cliente eliminado correctamente" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
