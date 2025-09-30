import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(3),
  subdomain: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  domain: z.string().url().optional(),
  description: z.string().optional(),
  plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(),
});


export const updateTenantSchema = z.object({
  name: z.string().min(3).optional(),
  subdomain: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
  domain: z.string().url().optional(),
  description: z.string().optional(),
  plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(),
  is_active: z.boolean().optional(),
});
