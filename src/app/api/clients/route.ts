// api/clients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/auth/jwt";
import { createClientSchema } from "@/lib/utils/validations/clients";
import { authAdmin } from "@/lib/auth/authRoles/authAdmin";
import { logAudit } from "@/lib/auditLogger";

// ========== POST: Create Client ==========
export async function POST(req: NextRequest) {
  try {

    const userAdmin = await authAdmin();
    if (userAdmin instanceof NextResponse) return userAdmin;

    // 4) Validar body
    const body = await req.json();
    const payload = createClientSchema.parse(body);

    // 5) Insertar cliente
    const { data, error: insertError } = await supabaseAdmin
      .from("clients")
      .insert([
        {
          tenant_id: userAdmin.tenant_id,
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


    // Registrar en auditoría
    const audit = await logAudit({
      tenant_id: userAdmin.tenant_id,
      user_id: userAdmin.id, // quién realizó la acción
      action: "CREATE",
      resource: "Se creo un negocio",
      resource_id: data.id, // a quién afecta
      payload: {
        ...data[0],
      },
    });

    if (audit instanceof NextResponse) { return audit; }


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

    const userAdmin = await authAdmin();
    if (userAdmin instanceof NextResponse) return userAdmin;

    // 4) Traer clientes del tenant
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("tenant_id", userAdmin.tenant_id)
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
