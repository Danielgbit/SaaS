// app/api/tenants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/auth/jwt";
import { createTenantSchema } from "@/lib/utils/validations/tenants"; // 🔹 define tu schema con zod
import { authAdmin } from "@/lib/auth/authRoles/authAdmin";
import { logAudit } from "@/lib/auditLogger";

// ========== GET: List Tenants ==========
export async function GET(req: NextRequest) {
  try {
    const userAdmin = await authAdmin();
    if (userAdmin instanceof NextResponse) return userAdmin; // Si no es admin o error

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
      .eq("id", userAdmin.tenant_id) // 🔹 un admin solo ve su propio tenant
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,domain.ilike.%${search}%,subdomain.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json(
        { error: "Error al obtener tenants" },
        { status: 500 }
      );
    }

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

    const userAdmin = await authAdmin();
    if (userAdmin instanceof NextResponse) return userAdmin; // Si no es admin o error

    // 4) Insertar tenant
    const { data: newTenant, error: insertError } = await supabaseAdmin
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

    // Registrar en auditoría
    const audit = await logAudit({
      tenant_id: userAdmin.tenant_id,
      user_id: userAdmin.id, // quién realizó la acción
      action: "CREATE",
      resource: "Se creo un negocio",
      resource_id: newTenant.id, // a quién afecta
      payload: {
        ...newTenant[0],
      },
    });

    if (audit instanceof NextResponse) { return audit; }
    
    // 6) Responder
    return NextResponse.json({ newTenant }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
