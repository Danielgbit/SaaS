// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantId } from "@/lib/tenancy/resolveTenantId";
import { updateUserSchema } from "@/lib/utils/validation";
import { verifyToken } from "@/lib/auth/jwt";
import { JWTPayload } from "@/types/auth";

type Params = { params: { id: string } };

// ========== GET ==========
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId requerido" },
        { status: 400 }
      );
    }

      const { id } = await context.params; // ✅ await
      console.log("GET /api/users/:id", { id, tenantId });


    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// ========== PUT ==========
export async function PUT(req: NextRequest, context: { params: Promise<{id: string}> }) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId requerido" },
        { status: 400 }
      );
    }

    // Validar rol ADMIN
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken<JWTPayload>(token) : null;
    if (!decoded || decoded.role_id !== "ADMIN") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const body = await req.json();
    const payload = updateUserSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        email: payload.email,
        password_hash: payload.password_hash ?? undefined,
        name: payload.name ?? undefined,
        role_id: payload.role_id ?? undefined,
        phone: payload.phone ?? undefined,
        is_active: payload.is_active ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: decoded?.sub ?? null,
      action: "UPDATE",
      resource: "users",
      resource_id: id,
      payload: payload,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// ========== DELETE ==========
// ========== DELETE ==========
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId requerido" },
        { status: 400 }
      );
    }

    // Extraer y verificar token
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken<JWTPayload>(token) : null;
    if (!decoded) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // 🔹 Consultar el rol del usuario autenticado
    const { data: role, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("code")
      .eq("id", decoded.role_id)
      .eq("tenant_id", decoded.tenant_id) // seguridad extra: rol del mismo tenant
      .single();

      console.log(role);
      console.log(decoded);
      
      

    if (roleError || !role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 403 }
      );
    }

    // 🔹 Validar que el rol sea ADMIN
    if (role.code !== "admin") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    // 🔹 Proceder con el borrado
    const { id } = await context.params;
    const { error } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    // Registrar auditoría
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: decoded.sub,
      action: "DELETE",
      resource: "users",
      resource_id: id,
      payload: null,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
