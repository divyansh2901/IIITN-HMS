import { z } from "zod";

export const applicationDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(2000).optional()
});
