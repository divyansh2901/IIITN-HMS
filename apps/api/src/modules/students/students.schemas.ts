import { z } from "zod";

export const studentListSchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export const profileUpdateSchema = z.object({
  phone: z.string().trim().max(30).optional(),
  guardianName: z.string().trim().max(160).optional(),
  guardianPhone: z.string().trim().max(30).optional()
});
