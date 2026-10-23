import { prisma } from "../../db/prisma.js";
import { badRequest, conflict, notFound } from "../../shared/errors.js";
import { writeAudit } from "../audit/audit.service.js";

export const createLeave = async (studentId: string, input: { departureAt: Date; expectedReturnAt: Date; destination: string; reason: string; additionalInfo?: string }) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.status !== "ACTIVE") throw notFound("Active student profile not found");
  const leave = await prisma.$transaction(async (tx) => {
    const created = await tx.leaveRequest.create({ data: { studentId, ...input, events: { create: { actorId: student.userId, type: "SUBMITTED" } } }, include: { events: true } });
    await writeAudit({ actorId: student.userId, action: "LEAVE_SUBMITTED", entityType: "LeaveRequest", entityId: created.id }, tx);
    return created;
  });
  return leave;
};

export const decideLeave = async (actorId: string, leaveId: string, decision: "APPROVED" | "REJECTED", remark?: string) => {
  const current = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!current) throw notFound("Leave request not found");
  if (current.status !== "PENDING") throw conflict("Only pending leave requests can be approved or rejected");
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.update({ where: { id: leaveId }, data: { status: decision, approverId: actorId, approvedAt: new Date(), approverRemark: remark, events: { create: { actorId, type: decision === "APPROVED" ? "APPROVED" : "REJECTED", note: remark } } } });
    await writeAudit({ actorId, action: `LEAVE_${decision}`, entityType: "LeaveRequest", entityId: leaveId, metadata: { remark } }, tx);
    return updated;
  });
  return result;
};

export const verify = async (actorId: string, leaveId: string, type: "DEPARTURE_VERIFIED" | "RETURN_VERIFIED", note?: string) => {
  const current = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!current) throw notFound("Leave request not found");
  if (type === "DEPARTURE_VERIFIED" && current.status !== "APPROVED") throw badRequest("Only approved leave can be marked as departed");
  if (type === "RETURN_VERIFIED" && current.status !== "DEPARTED") throw badRequest("Only departed leave can be marked as returned");
  const status = type === "DEPARTURE_VERIFIED" ? "DEPARTED" : "RETURNED";
  return prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.update({ where: { id: leaveId }, data: { status, events: { create: { actorId, type, note } } } });
    await writeAudit({ actorId, action: type, entityType: "LeaveRequest", entityId: leaveId, metadata: { note } }, tx);
    return updated;
  });
};
