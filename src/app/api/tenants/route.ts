// app/api/tenants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/auth/jwt";
import { JWTPayload } from "@/types/auth";
import { createTenantSchema } from "@/lib/utils/validations/tenants"; // 🔹 define tu schema con zod

// ========== GET: List Tenants ==========
export async function GET(req: NextRequest) {
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

    // 3) Query params (paginación, búsqueda opcional)
    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? "";
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "10");
    const from = (page - 1) * limit;
    const to = page * limit - 1;

    // 4) Construir query
    let query = supabaseAdmin
      .from("tenants")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,domain.ilike.%${search}%,subdomain.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // 5) Responder
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

// ========== POST: Create Tenants ==========
export async function POST(req: NextRequest) {
  try {
    // 1) Validar body
    const body = await req.json();
    const payload = createTenantSchema.parse(body);

    // 2) Validar token
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken<JWTPayload>(token) : null;
    if (!decoded) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 3) Validar rol (solo superadmin puede crear tenants)
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("code")
      .eq("id", decoded.role_id)
      .is("tenant_id", null) // 🔹 rol global
      .single();

    if (!role || role.code !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 4) Insertar tenant
    const { data, error: insertError } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: payload.name,
        subdomain: payload.subdomain,
        domain: payload.domain ?? null,
        description: payload.description ?? null,
        plan: payload.plan ?? "FREE",
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Error al crear tenant" },
        { status: 500 }
      );
    }

    // 5) Auditoría
    const { data: auditData, error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        tenant_id: data.id,
        user_id: decoded.sub,
        action: "CREATE",
        resource: "tenants",
        resource_id: data.id,
        payload: { name: data.name, subdomain: data.subdomain },
      });

    if (auditError) {
      return NextResponse.json(
        { error: "Error al registrar auditoría" },
        { status: 500 }
      );
    }

    // 6) Responder
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
