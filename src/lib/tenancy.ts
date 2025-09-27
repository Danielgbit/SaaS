import { NextRequest } from 'next/server';
import { z } from 'zod';
const uuid = z.string().uuid();

export function resolveTenantId(req: NextRequest) {
  const url = new URL(req.url);
  const param = url.searchParams.get('tenantId')?.trim();
  const header = req.headers.get('x-tenant-id')?.trim();
  const candidate = param && param.length ? param : header && header.length ? header : undefined;
  return candidate && uuid.safeParse(candidate).success ? candidate : undefined;
}
