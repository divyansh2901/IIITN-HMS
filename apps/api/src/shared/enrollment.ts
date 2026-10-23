import { z } from "zod";

export const configuredBranchCodes = ["CSE", "CSH", "CSD", "CSA", "ECE", "ECI"] as const;
export const enrollmentNumberSchema = z.string().trim().toUpperCase().regex(/^BT\d{2}[A-Z]{3}\d{3}$/, "Use the configured enrollment format, for example BT24CSE096");
export const parseEnrollmentNumber = (value: string) => {
  const normalized = enrollmentNumberSchema.parse(value);
  return { enrollmentNumber: normalized, program: normalized.slice(0, 2), admissionBatch: 2000 + Number(normalized.slice(2, 4)), branchCode: normalized.slice(4, 7), studentNumber: Number(normalized.slice(7)) };
};
