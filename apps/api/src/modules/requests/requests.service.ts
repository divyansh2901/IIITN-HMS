import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { badRequest, conflict, forbidden, notFound } from "../../shared/errors.js";
import { writeAudit } from "../audit/audit.service.js";
import { createUserNotification } from "../notifications/notifications.service.js";

const adminRoles = ["WARDEN", "SUPER_ADMIN"];
const makeReference = () => `REQ-${new Date().getFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;

export const requestTransitionMap: Record<string, string[]> = {
  PENDING_GUARD_REVIEW: ["FORWARDED_TO_ADMIN", "REJECTED_BY_GUARD"],
  FORWARDED_TO_ADMIN: ["IN_PROGRESS", "REJECTED_BY_ADMIN"],
  IN_PROGRESS: ["COMPLETED", "REJECTED_BY_ADMIN"],
  REJECTED_BY_GUARD: [],
  COMPLETED: [],
  REJECTED_BY_ADMIN: []
};

export const isValidRequestTransition = (from: string, to: string) => requestTransitionMap[from]?.includes(to) ?? false;

const includeRequest = {
  requestType: true,
  student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
  guardReviewer: { select: { fullName: true } },
  adminActor: { select: { fullName: true } },
  history: { orderBy: { createdAt: "asc" as const }, include: { actor: { select: { fullName: true, roles: { include: { role: true } } } } } }
};

const validateRequestDetails = (input: { departureAt?: Date; expectedReturnAt?: Date; destination?: string }, requiresLeaveDetails: boolean) => {
  if (requiresLeaveDetails && (!input.departureAt || !input.expectedReturnAt || !input.destination)) throw badRequest("Departure, expected return, and destination are required for this request type");
  if ((input.departureAt && !input.expectedReturnAt) || (!input.departureAt && input.expectedReturnAt)) throw badRequest("Departure and expected return must be provided together");
  if (input.departureAt && input.expectedReturnAt && input.expectedReturnAt <= input.departureAt) throw badRequest("Expected return must be after departure");
};

export const listRequestTypes = () => prisma.requestType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

export const createRequest = async (studentId: string, actorId: string, input: { requestTypeId: string; title: string; description: string; departureAt?: Date; expectedReturnAt?: Date; destination?: string }) => {
  const type = await prisma.requestType.findFirst({ where: { id: input.requestTypeId, isActive: true } });
  if (!type) throw notFound("Request type not found");
  validateRequestDetails(input, type.requiresLeaveDetails);
  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.hostelRequest.create({ data: { ...input, referenceNumber: makeReference(), studentId, history: { create: { newStatus: "PENDING_GUARD_REVIEW", action: "SUBMITTED", actorId } } }, include: includeRequest });
    await writeAudit({ actorId, action: "REQUEST_SUBMITTED", entityType: "HostelRequest", entityId: created.id, metadata: { referenceNumber: created.referenceNumber } }, tx);
    return created;
  });
  return request;
};

export const getRequest = async (id: string, actorId: string, roles: string[]) => {
  const request = await prisma.hostelRequest.findUnique({ where: { id }, include: includeRequest });
  if (!request) throw notFound("Request not found");
  if (request.student.userId !== actorId && !roles.some((role) => ["GUARD", ...adminRoles].includes(role))) throw forbidden("You cannot view this request");
  return request;
};

export const listMyRequests = (studentId: string) => prisma.hostelRequest.findMany({ where: { studentId }, orderBy: { createdAt: "desc" }, include: includeRequest });

const listQueue = async (where: Prisma.HostelRequestWhereInput, query: { q?: string; status?: string; requestTypeId?: string; page: number; pageSize: number }) => {
  const searchWhere: Prisma.HostelRequestWhereInput = query.q ? { OR: [{ referenceNumber: { contains: query.q, mode: "insensitive" } }, { student: { enrollmentNumber: { contains: query.q, mode: "insensitive" } } }, { student: { user: { fullName: { contains: query.q, mode: "insensitive" } } } }] } : {};
  const stageStatuses = Array.isArray((where.status as { in?: string[] } | undefined)?.in) ? (where.status as { in: string[] }).in : [where.status as string];
  const requestedStatusIsInStage = !query.status || stageStatuses.includes(query.status);
  const filters: Prisma.HostelRequestWhereInput = { ...where, ...searchWhere, ...(query.status && requestedStatusIsInStage ? { status: query.status as never } : {}), ...(query.status && !requestedStatusIsInStage ? { referenceNumber: "__NO_MATCHING_STAGE__" } : {}), ...(query.requestTypeId ? { requestTypeId: query.requestTypeId } : {}) };
  const [requests, total] = await Promise.all([
    prisma.hostelRequest.findMany({ where: filters, orderBy: { createdAt: "asc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: includeRequest }),
    prisma.hostelRequest.count({ where: filters })
  ]);
  return { requests, pagination: { page: query.page, pageSize: query.pageSize, total, pages: Math.ceil(total / query.pageSize) } };
};

export const guardQueue = (query: { q?: string; status?: string; requestTypeId?: string; page: number; pageSize: number }) => listQueue({ status: "PENDING_GUARD_REVIEW" }, query);
export const adminQueue = (query: { q?: string; status?: string; requestTypeId?: string; page: number; pageSize: number }) => listQueue({ status: { in: ["FORWARDED_TO_ADMIN", "IN_PROGRESS"] } }, query);

const transition = async (id: string, actorId: string, action: "GUARD_APPROVED_AND_FORWARDED" | "GUARD_REJECTED" | "ADMIN_STARTED" | "ADMIN_COMPLETED" | "ADMIN_REJECTED", expected: string[], nextStatus: "FORWARDED_TO_ADMIN" | "REJECTED_BY_GUARD" | "IN_PROGRESS" | "COMPLETED" | "REJECTED_BY_ADMIN", data: Record<string, unknown>, remarks?: string) => {
  return prisma.$transaction(async (tx) => {
    const current = await tx.hostelRequest.findUnique({ where: { id }, include: { student: { include: { user: true } } } });
    if (!current) throw notFound("Request not found");
    if (!expected.includes(current.status)) throw conflict(`This request is no longer eligible for ${action.toLowerCase().replaceAll("_", " ")}`);
    const updatedCount = await tx.hostelRequest.updateMany({ where: { id, status: { in: expected as never[] } }, data: { status: nextStatus, ...data } });
    if (!updatedCount.count) throw conflict("Another authorized user already processed this request. Refresh the queue.");
    const updated = await tx.hostelRequest.findUniqueOrThrow({ where: { id }, include: includeRequest });
    await tx.requestHistory.create({ data: { requestId: id, previousStatus: current.status, newStatus: nextStatus, action, actorId, remarks } });
    await createUserNotification({ recipientId: current.student.userId, type: "REQUEST_STATUS", title: `Request ${updated.referenceNumber} updated`, message: `Your request is now ${nextStatus.replaceAll("_", " ").toLowerCase()}.${remarks ? ` ${remarks}` : ""}`, relatedEntityType: "HostelRequest", relatedEntityId: id }, tx);
    await writeAudit({ actorId, action, entityType: "HostelRequest", entityId: id, metadata: { referenceNumber: current.referenceNumber, nextStatus } }, tx);
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

export const guardApproveForward = (id: string, actorId: string, remarks?: string) => transition(id, actorId, "GUARD_APPROVED_AND_FORWARDED", ["PENDING_GUARD_REVIEW"], "FORWARDED_TO_ADMIN", { guardReviewerId: actorId, guardDecisionAt: new Date(), guardRemarks: remarks }, remarks);
export const guardReject = (id: string, actorId: string, reason: string) => transition(id, actorId, "GUARD_REJECTED", ["PENDING_GUARD_REVIEW"], "REJECTED_BY_GUARD", { guardReviewerId: actorId, guardDecisionAt: new Date(), rejectionReason: reason, guardRemarks: reason }, reason);
export const adminStart = (id: string, actorId: string, remarks?: string) => transition(id, actorId, "ADMIN_STARTED", ["FORWARDED_TO_ADMIN"], "IN_PROGRESS", { adminActorId: actorId, processingStartedAt: new Date() }, remarks);
export const adminComplete = (id: string, actorId: string, completionNotes: string) => transition(id, actorId, "ADMIN_COMPLETED", ["IN_PROGRESS"], "COMPLETED", { adminActorId: actorId, completedAt: new Date(), completionNotes }, completionNotes);
export const adminReject = (id: string, actorId: string, reason: string) => transition(id, actorId, "ADMIN_REJECTED", ["FORWARDED_TO_ADMIN", "IN_PROGRESS"], "REJECTED_BY_ADMIN", { adminActorId: actorId, rejectionReason: reason }, reason);

export const canUseAdminQueue = (roles: string[]) => roles.some((role) => adminRoles.includes(role));
