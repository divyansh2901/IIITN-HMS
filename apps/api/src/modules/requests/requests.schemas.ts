import { z } from "zod";

const optionalDate = z.coerce.date().optional();

export const createRequestSchema = z.object({
  requestTypeId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(5000),
  departureAt: optionalDate,
  expectedReturnAt: optionalDate,
  destination: z.string().trim().max(255).optional()
});

export const remarkSchema = z.object({
  remarks: z.string().trim().max(3000).optional(),
  reason: z.string().trim().min(3).max(3000).optional(),
  completionNotes: z.string().trim().min(3).max(5000).optional()
});

export const requestListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["PENDING_GUARD_REVIEW", "REJECTED_BY_GUARD", "FORWARDED_TO_ADMIN", "IN_PROGRESS", "COMPLETED", "REJECTED_BY_ADMIN"]).optional(),
  requestTypeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export const requestIdSchema = z.object({ id: z.string().uuid() });
