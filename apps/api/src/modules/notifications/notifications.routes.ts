import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams } from "../../middleware/validate.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });
export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({ where: { recipientId: req.authUser!.id }, orderBy: { createdAt: "desc" }, take: 50 });
    res.json({ notifications, unreadCount: notifications.filter((item) => !item.readAt).length });
  } catch (error) { next(error); }
});

notificationsRouter.patch("/:id/read", validateParams(idSchema), async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({ where: { id: String(req.params.id), recipientId: req.authUser!.id, readAt: null }, data: { readAt: new Date() } });
    if (!result.count) { res.status(404).json({ error: "Notification not found", code: "NOT_FOUND" }); return; }
    res.status(204).send();
  } catch (error) { next(error); }
});

notificationsRouter.patch("/read-all", async (req, res, next) => {
  try { await prisma.notification.updateMany({ where: { recipientId: req.authUser!.id, readAt: null }, data: { readAt: new Date() } }); res.status(204).send(); }
  catch (error) { next(error); }
});
