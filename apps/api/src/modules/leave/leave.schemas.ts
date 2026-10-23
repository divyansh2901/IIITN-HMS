import { z } from "zod";

export const leaveCreateSchema = z.object({
  departureAt: z.coerce.date(),
  expectedReturnAt: z.coerce.date(),
  destination: z.string().trim().min(2).max(255),
  reason: z.string().trim().min(5).max(4000),
  additionalInfo: z.string().trim().max(4000).optional()
}).superRefine((value, ctx) => {
  if (value.expectedReturnAt <= value.departureAt) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedReturnAt"], message: "Expected return must be after departure" });
  if (value.departureAt <= new Date()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["departureAt"], message: "Departure must be in the future" });
});

export const leaveDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  remark: z.string().trim().max(2000).optional()
});

export const verificationSchema = z.object({
  type: z.enum(["DEPARTURE_VERIFIED", "RETURN_VERIFIED"]),
  note: z.string().trim().max(1000).optional()
});
