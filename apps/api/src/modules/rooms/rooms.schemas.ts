import { z } from "zod";

export const roomIdSchema = z.object({ id: z.string().uuid() });
export const createRoomSchema = z.object({
  floorId: z.string().uuid(),
  roomNumber: z.string().trim().min(1).max(20),
  roomType: z.enum(["DOUBLE", "FOUR_SEATER"]),
  capacity: z.number().int().min(1).max(12).optional(),
  operationalStatus: z.enum(["AVAILABLE", "MAINTENANCE", "UNAVAILABLE"]).default("AVAILABLE"),
  notes: z.string().trim().max(2000).optional()
});
export const allocationSchema = z.object({ studentId: z.string().uuid() });
export const listRoomsSchema = z.object({ floorId: z.string().uuid().optional(), status: z.enum(["AVAILABLE", "MAINTENANCE", "UNAVAILABLE"]).optional(), search: z.string().trim().max(80).optional() });
