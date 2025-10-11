// app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabaseAdmin } from "@/lib/supabase/server";
import { updateClientSchema } from "@/lib/utils/validations/clients";
import { authAdmin } from "@/lib/auth/authRoles/authAdmin";
import { logAudit } from "@/lib/auditLogger";

// ========== GET: Obtener cliente por ID ==========
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

    // 1) Verificar autenticación y autorización
    const userAdmin = await authAdmin();
    if (userAdmin instanceof NextResponse) return userAdmin;

    // 2) Traer cliente específico
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("tenant_id", userAdmin.tenant_id)
      .eq("id", clientId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // 3) Responder
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
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

    // 1) Verificar autenticación y autorización
    const userAdmin = await authAdmin();
    if (userAdmin instanceof NextResponse) return userAdmin;

    // 2) Validar body
    const body = await req.json();
    const payload = updateClientSchema.parse(body);

    // 3) Actualizar cliente
    const { data, error } = await supabaseAdmin
      .from("clients")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", userAdmin.tenant_id)
      .eq("id", clientId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Error al actualizar cliente" },
        { status: 500 }
      );
    }

    // 4) Registrar en auditoría
    const audit = await logAudit({
      tenant_id: userAdmin.tenant_id,
      user_id: userAdmin.id,
      action: "UPDATE",
      resource: "Se actualizó un cliente",
      resource_id: data.id,
      payload: {
        ...data,
      },
    });

    if (audit instanceof NextResponse) return audit;

    // 5) Responder
    return NextResponse.json({ data }, { status: 200 });
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

// ========== DELETE: Eliminar cliente ==========
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

    // 1) Verificar autenticación y autorización
    const userAdmin = await authAdmin();
    if (userAdmin instanceof NextResponse) return userAdmin;

    // 2) Obtener datos del cliente antes de eliminar para auditoría
    const { data: clientData, error: fetchError } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("tenant_id", userAdmin.tenant_id)
      .eq("id", clientId)
      .single();

    if (fetchError || !clientData) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // 3) Eliminar cliente
    const { error } = await supabaseAdmin
      .from("clients")
      .delete()
      .eq("tenant_id", userAdmin.tenant_id)
      .eq("id", clientId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4) Registrar en auditoría
    const audit = await logAudit({
      tenant_id: userAdmin.tenant_id,
      user_id: userAdmin.id,
      action: "DELETE",
      resource: "Se eliminó un cliente",
      resource_id: clientId,
      payload: {
        ...clientData,
      },
    });

    if (audit instanceof NextResponse) return audit;

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
