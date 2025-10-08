import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email("El email no es válido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  phone: z
    .string()
    .regex(/^\+?\d{7,15}$/, "El teléfono debe tener entre 7 y 15 dígitos")
    .optional(),
  tenant_id: z.string().uuid("El tenant_id debe ser un UUID válido").optional(),
  role_id: z.string().uuid("El role_id debe ser un UUID válido").optional(),
});


export const loginSchema = z.object({
  email: z.string().email("El email no es válido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});