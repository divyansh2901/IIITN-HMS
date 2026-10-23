import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { validate, validateParams } from "../../middleware/validate.js";
import { badRequest, conflict, notFound } from "../../shared/errors.js";
import { writeAudit } from "../audit/audit.service.js";
import { issueSchema, returnSchema } from "./equipment.schemas.js";

const idSchema = z.object({ id: z.string().uuid() });
const studentIdSchema = z.object({ studentId: z.string().uuid() });
const makeReference = () => `EQ-${new Date().getFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
const outstandingWhere: Prisma.EquipmentIssueWhereInput = { status: { in: ["ISSUED", "PARTIALLY_RETURNED"] } };

export const equipmentRouter = Router();
equipmentRouter.use(authenticate);

equipmentRouter.get("/", requireRoles("STUDENT", "WARDEN", "SUPER_ADMIN", "GUARD"), async (_req, res, next) => {
  try {
    const equipment = await prisma.equipment.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    res.json({ equipment });
  } catch (error) { next(error); }
});

equipmentRouter.get("/mine", requireRoles("STUDENT"), async (req, res, next) => {
  try {
    const issues = await prisma.equipmentIssue.findMany({ where: { studentId: req.authUser!.studentId }, orderBy: { issuedAt: "desc" }, include: { equipment: true, staff: { select: { fullName: true } }, returns: { orderBy: { returnedAt: "asc" } } } });
    res.json({ issues: issues.map((issue) => ({ ...issue, outstandingQuantity: issue.quantity - issue.quantityReturned, overdue: issue.expectedReturnAt < new Date() && issue.quantityReturned < issue.quantity })) });
  } catch (error) { next(error); }
});

equipmentRouter.get("/issues/outstanding", requireRoles("GUARD"), async (_req, res, next) => {
  try {
    const issues = await prisma.equipmentIssue.findMany({ where: outstandingWhere, orderBy: [{ expectedReturnAt: "asc" }, { issuedAt: "asc" }], include: { equipment: true, student: { include: { user: { select: { fullName: true } } } }, returns: { orderBy: { returnedAt: "asc" } } } });
    res.json({ issues: issues.map((issue) => ({ ...issue, outstandingQuantity: issue.quantity - issue.quantityReturned, overdue: issue.expectedReturnAt < new Date() && issue.quantityReturned < issue.quantity })) });
  } catch (error) { next(error); }
});

equipmentRouter.get("/issues/student/:studentId", requireRoles("GUARD"), validateParams(studentIdSchema), async (req, res, next) => {
  try {
    const issues = await prisma.equipmentIssue.findMany({ where: { studentId: String(req.params.studentId), ...outstandingWhere }, orderBy: { issuedAt: "desc" }, include: { equipment: true, returns: { orderBy: { returnedAt: "asc" } } } });
    res.json({ issues: issues.map((issue) => ({ ...issue, outstandingQuantity: issue.quantity - issue.quantityReturned, overdue: issue.expectedReturnAt < new Date() && issue.quantityReturned < issue.quantity })) });
  } catch (error) { next(error); }
});

equipmentRouter.get("/issues", requireRoles("GUARD"), async (_req, res, next) => {
  try {
    const issues = await prisma.equipmentIssue.findMany({ orderBy: { issuedAt: "desc" }, include: { equipment: true, student: { include: { user: { select: { fullName: true } } } }, staff: { select: { fullName: true } }, returns: { orderBy: { returnedAt: "asc" } } } });
    res.json({ issues });
  } catch (error) { next(error); }
});

equipmentRouter.post("/issues", requireRoles("GUARD"), validate(issueSchema), async (req, res, next) => {
  try {
    if (req.body.expectedReturnAt <= new Date()) throw badRequest("Due date must be in the future");
    const issue = await prisma.$transaction(async (tx) => {
      if (req.body.idempotencyKey) {
        const existing = await tx.equipmentIssue.findUnique({ where: { idempotencyKey: req.body.idempotencyKey } });
        if (existing) return existing;
      }
      await tx.$queryRaw`SELECT id FROM "Equipment" WHERE id = ${req.body.equipmentId}::uuid FOR UPDATE`;
      const equipment = await tx.equipment.findUnique({ where: { id: req.body.equipmentId } });
      if (!equipment || !equipment.isActive) throw notFound("Equipment not found");
      if (equipment.availableQuantity < req.body.quantity) throw conflict("Not enough equipment is available");
      const student = await tx.student.findUnique({ where: { id: req.body.studentId } });
      if (!student || student.status !== "ACTIVE") throw notFound("Active student not found");
      const created = await tx.equipmentIssue.create({ data: { equipmentId: equipment.id, studentId: student.id, staffId: req.authUser!.id, quantity: req.body.quantity, expectedReturnAt: req.body.expectedReturnAt, transactionReference: makeReference(), idempotencyKey: req.body.idempotencyKey, notes: req.body.notes } });
      await tx.equipment.update({ where: { id: equipment.id }, data: { availableQuantity: { decrement: req.body.quantity } } });
      await writeAudit({ actorId: req.authUser!.id, action: "EQUIPMENT_ISSUED", entityType: "EquipmentIssue", entityId: created.id, metadata: { transactionReference: created.transactionReference, equipmentId: equipment.id, quantity: req.body.quantity } }, tx);
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.status(201).json({ issue });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) next(conflict("The inventory changed while issuing equipment. Refresh and try again."));
    else next(error);
  }
});

const receiveEquipment: RequestHandler = async (req, res, next) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "EquipmentIssue" WHERE id = ${String(req.params.id)}::uuid FOR UPDATE`;
      const issue = await tx.equipmentIssue.findUnique({ where: { id: String(req.params.id) } });
      if (!issue) throw notFound("Equipment issue not found");
      if (req.body.idempotencyKey) {
        const existingReturn = await tx.equipmentReturn.findUnique({ where: { idempotencyKey: req.body.idempotencyKey } });
        if (existingReturn) return { issue, returned: existingReturn };
      }
      const outstanding = issue.quantity - issue.quantityReturned;
      if (outstanding <= 0 || !["ISSUED", "PARTIALLY_RETURNED"].includes(issue.status)) throw conflict("This equipment issue has no outstanding quantity");
      if (req.body.quantity > outstanding) throw badRequest(`Only ${outstanding} item(s) remain outstanding`);
      await tx.$queryRaw`SELECT id FROM "Equipment" WHERE id = ${issue.equipmentId}::uuid FOR UPDATE`;
      const fullyReturned = issue.quantityReturned + req.body.quantity === issue.quantity;
      const updated = await tx.equipmentIssue.update({ where: { id: issue.id }, data: { quantityReturned: { increment: req.body.quantity }, status: fullyReturned ? "RETURNED" : "PARTIALLY_RETURNED", returnedAt: fullyReturned ? new Date() : null } });
      const returned = await tx.equipmentReturn.create({ data: { issueId: issue.id, quantity: req.body.quantity, receivedBy: req.authUser!.id, condition: req.body.condition, notes: req.body.notes } });
      if (["GOOD", "FAIR"].includes(req.body.condition)) await tx.equipment.update({ where: { id: issue.equipmentId }, data: { availableQuantity: { increment: req.body.quantity } } });
      await writeAudit({ actorId: req.authUser!.id, action: "EQUIPMENT_RETURNED", entityType: "EquipmentReturn", entityId: returned.id, metadata: { issueId: issue.id, quantity: req.body.quantity, condition: req.body.condition } }, tx);
      return { issue: updated, returned };
    });
    res.json(result);
  } catch (error) { next(error); }
};

equipmentRouter.post("/issues/:id/returns", requireRoles("GUARD"), validateParams(idSchema), validate(returnSchema), receiveEquipment);

// Keep the old route as a deliberate compatibility alias, but it is still guard-only.
equipmentRouter.post("/issues/:id/return", requireRoles("GUARD"), validateParams(idSchema), validate(returnSchema), receiveEquipment);
