// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantId } from "@/lib/tenancy/resolveTenantId";
import {
  listUsersSchema,
  createUserSchema,
  parseSort,
} from "@/lib/utils/validation";
import { verifyToken } from "@/lib/auth/jwt";
import { JWTPayload } from "@/types/auth";

export async function GET(req: NextRequest) {
  try {
    // 1) Validar query params
    const url = new URL(req.url);
    const qs = Object.fromEntries(url.searchParams.entries());
    const parsed = listUsersSchema.parse(qs);

    // 2) Resolver tenantId (JWT > query > header)
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId requerido" },
        { status: 400 }
      );
    }

    // 3) Paginación y orden
    const { page, limit, search, sort } = parsed;
    const { column, ascending } = parseSort(sort);
    const from = (page - 1) * limit;
    const to = page * limit - 1;

    // 4) Construir consulta
    let query = supabaseAdmin
      .from("users")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
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

export async function POST(req: NextRequest) {
  try {
    // 1) Validar body
    const body = await req.json();
    const payload = createUserSchema.parse(body);

    // 2) Resolver tenantId desde JWT (más seguro que confiar en body)
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId requerido" },
        { status: 400 }
      );
    }

    // 3) Validar permisos: solo ADMIN del tenant puede crear usuarios
    const token = req.cookies.get("token")?.value;
      const decoded = token ? verifyToken<JWTPayload>(token) : null;    if (!decoded || decoded.role_id !== "ADMIN") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    // 4) Insertar usuario
    const { data, error } = await supabaseAdmin
      .from("users")
      .insert({
        tenant_id: tenantId,
        email: payload.email,
        password_hash: payload.password_hash ?? null,
        name: payload.name ?? null,
        role_id: payload.role_id ?? null,
        phone: payload.phone ?? null,
        is_active: payload.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) throw error;

    // 5) Auditoría
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: decoded?.sub ?? null,
      action: "CREATE",
      resource: "users",
      resource_id: data.id,
      payload: { email: data.email },
    });

    // 6) Responder
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
