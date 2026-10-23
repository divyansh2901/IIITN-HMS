import { z } from "zod";

export const issueSchema = z.object({
  equipmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  expectedReturnAt: z.coerce.date(),
  idempotencyKey: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional()
});
export const returnSchema = z.object({
  quantity: z.number().int().min(1).max(20),
  condition: z.enum(["GOOD", "FAIR", "DAMAGED", "UNUSABLE"]),
  idempotencyKey: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional()
});
