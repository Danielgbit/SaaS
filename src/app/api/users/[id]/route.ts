// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabaseAdmin } from '@/lib/supabase/server';
import { resolveTenantId } from '@/lib/tenancy';
import { updateUserSchema } from '@/lib/utils/validation';

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    const { id } = params;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) {
      // Si no existe, Supabase puede lanzar error. Devuelve 404.
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    const { id } = params;
    const body = await req.json();
    const payload = updateUserSchema.parse(body);

    // (Opcional) Validar permisos (ADMIN del tenant)
    // TODO: auth/roles

    // Asegurar que el usuario a actualizar pertenece al tenant
    // (si no, update no afectará filas)
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        email: payload.email,
        password_hash: payload.password_hash ?? undefined,
        name: payload.name ?? undefined,
        role_id: payload.role_id ?? undefined,
        phone: payload.phone ?? undefined,
        is_active: payload.is_active ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: tenantId,
      action: 'UPDATE',
      resource: 'users',
      resource_id: id,
      payload: payload,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    const { id } = params;

    // (Opcional) Soft-delete: set is_active=false en lugar de borrar
    // Aquí hacemos hard delete para el ejemplo
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: tenantId,
      action: 'DELETE',
      resource: 'users',
      resource_id: id,
      payload: null,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
