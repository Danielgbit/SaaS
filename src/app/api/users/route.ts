// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabaseAdmin } from '@/lib/supabase/server';
import { resolveTenantId } from '@/lib/tenancy';
import { listUsersSchema, createUserSchema, parseSort } from '@/lib/utils/validation';

export async function GET(req: NextRequest) {
  try {
    // 1) Validar query params
    const url = new URL(req.url);
    const qs = Object.fromEntries(url.searchParams.entries());
    const parsed = listUsersSchema.parse(qs);

    // 2) Resolver tenantId (query ?tenantId= o header x-tenant-id)
    const tenantId = parsed.tenantId ?? resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    // 3) Paginación y orden
    const { page, limit, search, sort } = parsed;
    const { column, ascending } = parseSort(sort);
    const from = (page - 1) * limit;
    const to = page * limit - 1;

    // 4) Construir consulta
    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
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

    // 7) Responder con data y metadatos de paginación
    return NextResponse.json({
      data,
      page,
      limit,
      total: count ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1) Leer y validar body
    const body = await req.json();
    const payload = createUserSchema.parse(body);

    // 2) (Opcional) Validar permisos del usuario autenticado para este tenant
    // TODO: comprobar rol ADMIN del tenant

    // 3) Insertar usuario
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        tenant_id: payload.tenant_id,
        email: payload.email,
        password_hash: payload.password_hash ?? null,
        name: payload.name ?? null,
        role_id: payload.role_id ?? null,
        phone: payload.phone ?? null,
        is_active: payload.is_active ?? true,
      })
      .select('*')
      .single();

    if (error) throw error;

    // 4) Registrar auditoría
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: payload.tenant_id,
      action: 'CREATE',
      resource: 'users',
      resource_id: data.id,
      payload: { email: data.email },
    });

    // 5) Responder
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    // Tip: puedes detectar unique_violation de email por código de error de PostgREST
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
