import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { validate, validateParams } from "../../middleware/validate.js";
import { writeAudit } from "../audit/audit.service.js";
import { noticeSchema } from "./notices.schemas.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });
export const noticesRouter = Router();
noticesRouter.use(authenticate);

noticesRouter.get("/", async (_req, res, next) => {
  try { res.json({ notices: await prisma.notice.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" }, include: { author: { select: { fullName: true } } } }) }); }
  catch (error) { next(error); }
});
noticesRouter.get("/manage", requireRoles("WARDEN", "SUPER_ADMIN"), async (_req, res, next) => {
  try { res.json({ notices: await prisma.notice.findMany({ orderBy: { createdAt: "desc" }, include: { author: { select: { fullName: true } } } }) }); }
  catch (error) { next(error); }
});
noticesRouter.post("/", requireRoles("WARDEN", "SUPER_ADMIN"), validate(noticeSchema), async (req, res, next) => {
  try {
    const notice = await prisma.notice.create({ data: { ...req.body, authorId: req.authUser!.id, publishedAt: req.body.isPublished ? new Date() : undefined } });
    await writeAudit({ actorId: req.authUser!.id, action: "NOTICE_CREATED", entityType: "Notice", entityId: notice.id });
    res.status(201).json({ notice });
  } catch (error) { next(error); }
});
noticesRouter.patch("/:id/publish", requireRoles("WARDEN", "SUPER_ADMIN"), validateParams(idSchema), async (req, res, next) => {
  try {
    const notice = await prisma.notice.update({ where: { id: String(req.params.id) }, data: { isPublished: Boolean(req.body.isPublished), publishedAt: req.body.isPublished ? new Date() : null } });
    await writeAudit({ actorId: req.authUser!.id, action: "NOTICE_PUBLISH_STATUS_CHANGED", entityType: "Notice", entityId: notice.id });
    res.json({ notice });
  } catch (error) { next(error); }
});
