// lib/validation.ts
import { z } from 'zod';

export const listUsersSchema = z.object({
  tenantId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(), // ej: "created_at.desc"
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password_hash: z.string().min(10).optional(),
  name: z.string().optional(),
  role_id: z.string().uuid().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  // En update no permitas cambiar tenant_id (opcional, pero recomendado)
  tenant_id: z.never().optional()
});

export function parseSort(sort?: string) {
  if (!sort) return { column: 'created_at', ascending: false };
  const [col, dir] = sort.split('.');
  return { column: col || 'created_at', ascending: (dir || 'desc') !== 'desc' };
}
