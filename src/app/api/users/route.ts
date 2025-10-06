// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import {
  listUsersSchema,
  createUserSchema,
  parseSort,
} from "@/lib/utils/validations/users";
import { getAuthUser } from "@/lib/auth/authUser";

export async function GET(req: NextRequest) {
  try {
    // 1) Validar query params
    const url = new URL(req.url);
    const qs = Object.fromEntries(url.searchParams.entries());
    const parsed = listUsersSchema.parse(qs);

    // 3) Paginación y orden
    const { page, limit, search, sort } = parsed;
    const { column, ascending } = parseSort(sort);
    const from = (page - 1) * limit;
    const to = page * limit - 1;

    const user = await getAuthUser();
    // 4) Construir consulta
    let query = supabaseAdmin
      .from("users")
      .select("*", { count: "exact" })
      .eq("tenant_id", user.tenant_id)
      .order(column, { ascending })
      .range(from, to);

    // 5) Búsqueda básica (email, name, phone)
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    // 6) Ejecutar
    const { data, error, count } = await query;
    if (error) throw error;

    // 7) Responder con data y metadatos
    return NextResponse.json({
      data,
      page,
      limit,
      total: count ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// Create user (only ADMIN)
export async function createUser(req: NextRequest, tenantId: string) {
  try {
    const body = await req.json();
    const payload = createUserSchema.parse(body);

    const roleId = req.headers.get("x-role-id");
    const userId = req.headers.get("x-user-id");

    // 🔹 Validar que sea ADMIN
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("code")
      .eq("id", roleId)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .single();

    if (!role || role.code !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Verificar que el role_id a asignar exista y esté disponible para el tenant
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

    // 🔹 Hash contraseña si viene
    let password_hash = null;
    if (payload.password_hash) {
      const bcrypt = await import("bcryptjs");
      password_hash = await bcrypt.hash(payload.password_hash, 10);
    }

    const { data, error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        tenant_id: tenantId,
        email: payload.email,
        password_hash,
        name: payload.name ?? null,
        role_id: payload.role_id ?? null,
        phone: payload.phone ?? null,
        is_active: payload.is_active ?? true,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Error al crear usuario" },
        { status: 500 }
      );
    }

    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: userId ?? null,
      action: "CREATE",
      resource: "users",
      resource_id: data.id,
      payload: {
        email: data.email,
        role_id: data.role_id,
        name: data.name,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
