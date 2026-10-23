import { z } from "zod";

export const noticeSchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(5).max(10000),
  isPublished: z.boolean().default(false)
});
