import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { conflict, notFound, badRequest } from "../../shared/errors.js";
import { writeAudit } from "../audit/audit.service.js";

const capacityForType = (type: "DOUBLE" | "FOUR_SEATER") => type === "DOUBLE" ? 2 : 4;

export const listRooms = async (query: { floorId?: string; status?: "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE"; search?: string }) => {
  const rooms = await prisma.room.findMany({
    where: { floorId: query.floorId, operationalStatus: query.status, ...(query.search ? { roomNumber: { contains: query.search, mode: "insensitive" } } : {}) },
    orderBy: [{ floor: { number: "asc" } }, { roomNumber: "asc" }],
    include: { floor: true, allocations: { where: { status: "ACTIVE" }, include: { student: { include: { user: { select: { fullName: true } } } } } } }
  });
  return rooms.map((room) => ({ ...room, occupied: room.allocations.length, available: room.capacity - room.allocations.length }));
};

export const createRoom = async (actorId: string, input: { floorId: string; roomNumber: string; roomType: "DOUBLE" | "FOUR_SEATER"; capacity?: number; operationalStatus: "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE"; notes?: string }) => {
  const capacity = input.capacity ?? capacityForType(input.roomType);
  const floor = await prisma.floor.findUnique({ where: { id: input.floorId } });
  if (!floor) throw notFound("Floor not found");
  const room = await prisma.room.create({ data: { ...input, capacity } });
  await writeAudit({ actorId, action: "ROOM_CREATED", entityType: "Room", entityId: room.id, metadata: { roomNumber: room.roomNumber } });
  return room;
};

export const allocate = async (actorId: string, roomId: string, studentId: string) => {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${roomId}::uuid FOR UPDATE`;
      const room = await tx.room.findUnique({ where: { id: roomId } });
      if (!room) throw notFound("Room not found");
      if (room.operationalStatus !== "AVAILABLE") throw conflict("This room is not available for allocation");
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student || student.status !== "ACTIVE") throw notFound("Active student not found");
      const current = await tx.roomAllocation.findFirst({ where: { studentId, status: "ACTIVE" } });
      if (current) throw conflict("This student already has an active room allocation");
      const occupied = await tx.roomAllocation.count({ where: { roomId, status: "ACTIVE" } });
      if (occupied >= room.capacity) throw conflict("This room has no vacant seats");
      const allocation = await tx.roomAllocation.create({ data: { roomId, studentId, allocatedBy: actorId } });
      await writeAudit({ actorId, action: "ROOM_ALLOCATED", entityType: "RoomAllocation", entityId: allocation.id, metadata: { roomId, studentId } }, tx);
      return allocation;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) throw conflict("The room or student changed while this allocation was being processed. Refresh and try again.");
    throw error;
  }
};

export const vacate = async (actorId: string, allocationId: string, reason?: string) => {
  const allocation = await prisma.roomAllocation.findUnique({ where: { id: allocationId } });
  if (!allocation || allocation.status !== "ACTIVE") throw badRequest("Only an active allocation can be vacated");
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.roomAllocation.update({ where: { id: allocationId }, data: { status: "VACATED", vacatedAt: new Date(), reason } });
    await writeAudit({ actorId, action: "ROOM_VACATED", entityType: "RoomAllocation", entityId: allocationId, metadata: { reason } }, tx);
    return result;
  });
  return updated;
};
