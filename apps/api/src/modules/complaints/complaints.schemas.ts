import { z } from "zod";

export const complaintCreateSchema = z.object({
  categoryId: z.string().uuid(),
  description: z.string().trim().min(10).max(5000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM")
});

export const complaintUpdateSchema = z.object({
  status: z.enum(["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  remark: z.string().trim().max(3000).optional(),
  assigneeId: z.string().uuid().optional()
});
