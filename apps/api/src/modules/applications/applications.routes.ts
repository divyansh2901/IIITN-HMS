import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { validate, validateParams } from "../../middleware/validate.js";
import { conflict, notFound } from "../../shared/errors.js";
import { writeAudit } from "../audit/audit.service.js";
import { applicationDecisionSchema } from "./applications.schemas.js";

const idSchema = z.object({ id: z.string().uuid() });
export const applicationsRouter = Router();
applicationsRouter.use(authenticate);

applicationsRouter.get("/mine", requireRoles("STUDENT"), async (req, res, next) => {
  try { res.json({ application: await prisma.hostelApplication.findUnique({ where: { studentId: req.authUser!.studentId }, include: { reviewer: { select: { fullName: true } } } }) }); }
  catch (error) { next(error); }
});
applicationsRouter.post("/", requireRoles("STUDENT"), async (req, res, next) => {
  try {
    const existing = await prisma.hostelApplication.findUnique({ where: { studentId: req.authUser!.studentId } });
    if (existing) throw conflict("A hostel application already exists for this student");
    const application = await prisma.hostelApplication.create({ data: { studentId: req.authUser!.studentId! } });
    await writeAudit({ actorId: req.authUser!.id, action: "HOSTEL_APPLICATION_SUBMITTED", entityType: "HostelApplication", entityId: application.id });
    res.status(201).json({ application });
  } catch (error) { next(error); }
});
applicationsRouter.get("/", requireRoles("WARDEN", "SUPER_ADMIN"), async (_req, res, next) => {
  try { res.json({ applications: await prisma.hostelApplication.findMany({ orderBy: [{ submittedAt: "asc" }, { id: "asc" }], include: { student: { include: { user: { select: { fullName: true, email: true } } } }, reviewer: { select: { fullName: true } } } }) }); }
  catch (error) { next(error); }
});
applicationsRouter.post("/:id/decision", requireRoles("WARDEN", "SUPER_ADMIN"), validateParams(idSchema), validate(applicationDecisionSchema), async (req, res, next) => {
  try {
    const current = await prisma.hostelApplication.findUnique({ where: { id: String(req.params.id) } });
    if (!current) throw notFound("Hostel application not found");
    if (current.status !== "SUBMITTED") throw conflict("Only submitted applications can be reviewed");
    const application = await prisma.hostelApplication.update({ where: { id: current.id }, data: { status: req.body.decision, reviewedBy: req.authUser!.id, reviewedAt: new Date(), reviewNote: req.body.note } });
    await writeAudit({ actorId: req.authUser!.id, action: `HOSTEL_APPLICATION_${req.body.decision}`, entityType: "HostelApplication", entityId: current.id });
    res.json({ application });
  } catch (error) { next(error); }
});
