import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { validate, validateParams } from "../../middleware/validate.js";
import { leaveCreateSchema, leaveDecisionSchema, verificationSchema } from "./leave.schemas.js";
import * as service from "./leave.service.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });
export const leaveRouter = Router();
leaveRouter.use(authenticate);

leaveRouter.get("/mine", requireRoles("STUDENT"), async (req, res, next) => {
  try { res.json({ leaveRequests: await prisma.leaveRequest.findMany({ where: { studentId: req.authUser!.studentId }, orderBy: { createdAt: "desc" }, include: { events: { orderBy: { createdAt: "asc" } } } }) }); }
  catch (error) { next(error); }
});
leaveRouter.post("/", requireRoles("STUDENT"), validate(leaveCreateSchema), async (req, res, next) => {
  try { res.status(201).json({ leaveRequest: await service.createLeave(req.authUser!.studentId!, req.body) }); }
  catch (error) { next(error); }
});
leaveRouter.get("/", requireRoles("WARDEN", "SUPER_ADMIN", "GUARD"), async (req, res, next) => {
  try { res.json({ leaveRequests: await prisma.leaveRequest.findMany({ orderBy: { createdAt: "desc" }, include: { student: { include: { user: { select: { fullName: true } } } }, events: { orderBy: { createdAt: "asc" } } } }) }); }
  catch (error) { next(error); }
});
leaveRouter.post("/:id/decision", requireRoles("WARDEN", "SUPER_ADMIN"), validateParams(idSchema), validate(leaveDecisionSchema), async (req, res, next) => {
  try { res.json({ leaveRequest: await service.decideLeave(req.authUser!.id, String(req.params.id), req.body.decision, req.body.remark) }); }
  catch (error) { next(error); }
});
leaveRouter.post("/:id/verify", requireRoles("WARDEN", "SUPER_ADMIN", "GUARD"), validateParams(idSchema), validate(verificationSchema), async (req, res, next) => {
  try { res.json({ leaveRequest: await service.verify(req.authUser!.id, String(req.params.id), req.body.type, req.body.note) }); }
  catch (error) { next(error); }
});
