import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";

export const auditRouter = Router();
auditRouter.use(authenticate, requireRoles("WARDEN", "SUPER_ADMIN"));
auditRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1)); const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 25)));
    const [events, total] = await Promise.all([prisma.auditLog.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" }, include: { actor: { select: { fullName: true, email: true } } } }), prisma.auditLog.count()]);
    res.json({ events, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
  } catch (error) { next(error); }
});
