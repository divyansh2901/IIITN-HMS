import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { validate, validateParams } from "../../middleware/validate.js";
import { badRequest, notFound } from "../../shared/errors.js";
import { writeAudit } from "../audit/audit.service.js";
import { complaintCreateSchema, complaintUpdateSchema } from "./complaints.schemas.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });
const transitions: Record<string, string[]> = {
  SUBMITTED: ["ASSIGNED", "IN_PROGRESS"], ASSIGNED: ["IN_PROGRESS"], IN_PROGRESS: ["RESOLVED"], RESOLVED: ["CLOSED"], CLOSED: []
};

export const complaintsRouter = Router();
complaintsRouter.use(authenticate);

complaintsRouter.get("/categories", async (_req, res, next) => {
  try { res.json({ categories: await prisma.complaintCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }) }); }
  catch (error) { next(error); }
});
complaintsRouter.get("/mine", requireRoles("STUDENT"), async (req, res, next) => {
  try { res.json({ complaints: await prisma.complaint.findMany({ where: { studentId: req.authUser!.studentId }, orderBy: { createdAt: "desc" }, include: { category: true, history: { orderBy: { createdAt: "asc" } } } }) }); }
  catch (error) { next(error); }
});
complaintsRouter.post("/", requireRoles("STUDENT"), validate(complaintCreateSchema), async (req, res, next) => {
  try {
    const category = await prisma.complaintCategory.findFirst({ where: { id: req.body.categoryId, isActive: true } });
    if (!category) throw notFound("Complaint category not found");
    const allocation = await prisma.roomAllocation.findFirst({ where: { studentId: req.authUser!.studentId, status: "ACTIVE" } });
    const complaint = await prisma.$transaction(async (tx) => {
      const created = await tx.complaint.create({ data: { studentId: req.authUser!.studentId!, categoryId: req.body.categoryId, roomId: allocation?.roomId, description: req.body.description, priority: req.body.priority, history: { create: { actorId: req.authUser!.id, toStatus: "SUBMITTED" } } }, include: { category: true } });
      await writeAudit({ actorId: req.authUser!.id, action: "COMPLAINT_SUBMITTED", entityType: "Complaint", entityId: created.id }, tx);
      return created;
    });
    res.status(201).json({ complaint });
  } catch (error) { next(error); }
});
complaintsRouter.get("/", requireRoles("WARDEN", "SUPER_ADMIN", "STAFF"), async (req, res, next) => {
  try {
    const where = req.authUser!.roles.includes("STAFF") && !req.authUser!.roles.some((role) => ["WARDEN", "SUPER_ADMIN"].includes(role)) ? { assigneeId: req.authUser!.id } : {};
    res.json({ complaints: await prisma.complaint.findMany({ where, orderBy: { createdAt: "desc" }, include: { student: { include: { user: { select: { fullName: true } } } }, category: true, room: { include: { floor: true } }, assignee: { select: { fullName: true } }, history: { orderBy: { createdAt: "asc" } } } }) });
  } catch (error) { next(error); }
});
complaintsRouter.patch("/:id", requireRoles("WARDEN", "SUPER_ADMIN", "STAFF"), validateParams(idSchema), validate(complaintUpdateSchema), async (req, res, next) => {
  try {
    const current = await prisma.complaint.findUnique({ where: { id: String(req.params.id) } });
    if (!current) throw notFound("Complaint not found");
    if (!transitions[current.status].includes(req.body.status)) throw badRequest(`Cannot move a complaint from ${current.status} to ${req.body.status}`);
    if (req.authUser!.roles.includes("STAFF") && !req.authUser!.roles.some((role) => ["WARDEN", "SUPER_ADMIN"].includes(role)) && current.assigneeId !== req.authUser!.id) throw badRequest("This complaint is not assigned to you");
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.complaint.update({ where: { id: current.id }, data: { status: req.body.status, resolution: req.body.status === "RESOLVED" || req.body.status === "CLOSED" ? req.body.remark : undefined, resolvedAt: req.body.status === "RESOLVED" ? new Date() : undefined, assigneeId: req.body.assigneeId ?? current.assigneeId, history: { create: { actorId: req.authUser!.id, fromStatus: current.status, toStatus: req.body.status, remark: req.body.remark } } } });
      await writeAudit({ actorId: req.authUser!.id, action: "COMPLAINT_UPDATED", entityType: "Complaint", entityId: current.id, metadata: { status: req.body.status } }, tx);
      return result;
    });
    res.json({ complaint: updated });
  } catch (error) { next(error); }
});
