import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { validate, validateParams } from "../../middleware/validate.js";
import { conflict, notFound } from "../../shared/errors.js";
import { writeAudit } from "../audit/audit.service.js";
import { issueSchema, returnSchema } from "./equipment.schemas.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });
export const equipmentRouter = Router();
equipmentRouter.use(authenticate);

equipmentRouter.get("/", requireRoles("STUDENT", "WARDEN", "SUPER_ADMIN", "GUARD", "STAFF"), async (_req, res, next) => {
  try { res.json({ equipment: await prisma.equipment.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }) }); }
  catch (error) { next(error); }
});
equipmentRouter.get("/mine", requireRoles("STUDENT"), async (req, res, next) => {
  try { res.json({ issues: await prisma.equipmentIssue.findMany({ where: { studentId: req.authUser!.studentId }, orderBy: { issuedAt: "desc" }, include: { equipment: true, staff: { select: { fullName: true } } } }) }); }
  catch (error) { next(error); }
});
equipmentRouter.get("/issues", requireRoles("WARDEN", "SUPER_ADMIN", "GUARD", "STAFF"), async (_req, res, next) => {
  try { res.json({ issues: await prisma.equipmentIssue.findMany({ orderBy: { issuedAt: "desc" }, include: { equipment: true, student: { include: { user: { select: { fullName: true } } } }, staff: { select: { fullName: true } } } }) }); }
  catch (error) { next(error); }
});
equipmentRouter.post("/issues", requireRoles("WARDEN", "SUPER_ADMIN", "GUARD", "STAFF"), validate(issueSchema), async (req, res, next) => {
  try {
    const issue = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Equipment" WHERE id = ${req.body.equipmentId}::uuid FOR UPDATE`;
      const equipment = await tx.equipment.findUnique({ where: { id: req.body.equipmentId } });
      if (!equipment || !equipment.isActive) throw notFound("Equipment not found");
      if (equipment.availableQuantity < req.body.quantity) throw conflict("Not enough equipment is available");
      const student = await tx.student.findUnique({ where: { id: req.body.studentId } });
      if (!student || student.status !== "ACTIVE") throw notFound("Active student not found");
      const created = await tx.equipmentIssue.create({ data: { ...req.body, staffId: req.authUser!.id } });
      await tx.equipment.update({ where: { id: equipment.id }, data: { availableQuantity: { decrement: req.body.quantity } } });
      await writeAudit({ actorId: req.authUser!.id, action: "EQUIPMENT_ISSUED", entityType: "EquipmentIssue", entityId: created.id, metadata: { equipmentId: equipment.id, quantity: req.body.quantity } }, tx);
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.status(201).json({ issue });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") next(conflict("Inventory changed while issuing equipment. Refresh and try again."));
    else next(error);
  }
});
equipmentRouter.post("/issues/:id/return", requireRoles("WARDEN", "SUPER_ADMIN", "GUARD", "STAFF"), validateParams(idSchema), validate(returnSchema), async (req, res, next) => {
  try {
    const issue = await prisma.equipmentIssue.findUnique({ where: { id: String(req.params.id) } });
    if (!issue || issue.status !== "ISSUED") throw conflict("This equipment issue has already been returned or closed");
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.equipmentIssue.update({ where: { id: issue.id }, data: { status: "RETURNED", returnedAt: new Date(), returnCondition: req.body.returnCondition, notes: req.body.notes ?? issue.notes } });
      await tx.equipment.update({ where: { id: issue.equipmentId }, data: { availableQuantity: { increment: req.body.returnCondition === "UNUSABLE" ? 0 : issue.quantity }, condition: req.body.returnCondition } });
      await writeAudit({ actorId: req.authUser!.id, action: "EQUIPMENT_RETURNED", entityType: "EquipmentIssue", entityId: issue.id, metadata: { condition: req.body.returnCondition } }, tx);
      return result;
    });
    res.json({ issue: updated });
  } catch (error) { next(error); }
});
