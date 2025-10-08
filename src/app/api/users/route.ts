// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import {
  createUserSchema,
  listUsersSchema,
  parseSort,
} from "@/lib/utils/validations/users";
import { authAdmin } from "@/lib/auth/authRoles/authAdmin";
import { logAudit } from "@/lib/auditLogger";

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

    const user = await authAdmin();
    if (user instanceof NextResponse) return user; // Si no es admin o error

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
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = createUserSchema.parse(body);

    const user = await authAdmin();
    if (user instanceof NextResponse) return user;

    // 🔹 Hash contraseña si viene
    let password_hash = null;
    if (payload.password_hash) {
      const bcrypt = await import("bcryptjs");
      password_hash = await bcrypt.hash(payload.password_hash, 10);
    }

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        tenant_id: user.tenant_id,
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

    // 5️⃣ Registrar en auditoría
    await logAudit({
      tenant_id: user.tenant_id,
      user_id: user.id, // quién realizó la acción
      action: "CREATE",
      resource: "users",
      resource_id: newUser.id, // a quién afecta
      payload: {
        email: newUser.email,
        role_id: newUser.role_id,
        name: newUser.name,
        phone: newUser.phone,
      },
    });

    return NextResponse.json({ newUser }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
