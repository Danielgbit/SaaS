// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { updateUserSchema } from "@/lib/utils/validations/users";
import { getAuthUser } from "@/lib/auth/authUser";

type Params = { params: { id: string } };

// ========== GET ==========
export async function getUserById(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  tenantId: string
) {
  try {
    const { id } = await context.params; // ✅ await

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
export async function updateUser(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  tenantId: string | undefined
) {
  try {
    const user = await getAuthPayload(req);

    // 🔹 Consultar rol real
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("code")
      .eq("id", user.role_id)
      .or(`tenant_id.eq.${user.tenant_id},tenant_id.is.null`)
      .single();

    if (!role || role.code !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 🔹 Extraer params
    const { id } = await context.params;

    // 🔹 Verificar que el usuario exista antes de actualizar
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (!existingUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // 🔹 Validar body
    const body = await req.json();
    const payload = updateUserSchema.parse(body);

    // 🔹 Verificar que el role_id a asignar exista y sea válido para el tenant
    if (payload.role_id) {
      const { data: roleToAssign } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("id", payload.role_id)
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .single();

      if (!roleToAssign) {
        return NextResponse.json(
          { error: "El role_id proporcionado no es válido o no existe" },
          { status: 400 }
        );
      }
    }

    // 🔹 Hash de password si viene
    let password_hash: string | undefined = undefined;
    if (payload.password_hash) {
      const bcrypt = await import("bcryptjs");
      password_hash = await bcrypt.hash(payload.password_hash, 10);
    }

    // 🔹 Actualizar usuario
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        email: payload.email ?? undefined,
        password_hash,
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

    // 🔹 Log de auditoría
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: decoded?.sub ?? null,
      action: "UPDATE",
      resource: "users",
      resource_id: id,
      payload,
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
export async function deleteUser(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  tenantId: string
) {
  try {
    const roleId = req.headers.get("x-role-id");
    const userId = req.headers.get("x-user-id");
    // 🔹 Consultar el rol del usuario autenticado
    const { data: role, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("code")
      .eq("id", roleId)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ error: "Rol no encontrado" }, { status: 403 });
    }

    // 🔹 Validar que el rol sea ADMIN
    if (role.code !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 🔹 Proceder con el borrado
    const { id } = await context.params;

    const { error, data, count } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("*"); // para ver si devuelve algo

    if (error) {
      return NextResponse.json(
        { error: "Error al eliminar usuario" },
        { status: 404 }
      );
    }

    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        tenant_id: tenantId,
        user_id: userId, // el admin que ejecuta
        action: "delete",
        resource: "users",
        resource_id: id, // el usuario eliminado
        payload: {
          deleted_user_id: id,
          deleted_role: role.code,
          deleted_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error("Error audit log:", auditError);
    }

    if (auditError) {
      return NextResponse.json(
        { error: "Error registro de auditoría" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
