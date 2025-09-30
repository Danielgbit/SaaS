
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