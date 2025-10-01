
import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  document_id: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(), // YYYY-MM-DD
  notes: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});


export const updateClientSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  document_id: z.string().optional(),
  birth_date: z.string().optional(), // formato ISO (ej: "1990-05-20")
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
});