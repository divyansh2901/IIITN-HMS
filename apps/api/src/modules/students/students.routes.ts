import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { profileUpdateSchema, studentListSchema } from "./students.schemas.js";

export const studentsRouter = Router();
studentsRouter.use(authenticate);

studentsRouter.get("/me", requireRoles("STUDENT"), async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.authUser!.studentId },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        allocations: { where: { status: "ACTIVE" }, include: { room: { include: { floor: true } } } }
      }
    });
    res.json({ student });
  } catch (error) { next(error); }
});

studentsRouter.get("/search", requireRoles("GUARD"), async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const limit = Math.min(20, Math.max(1, Number(req.query.limit ?? 10)));
    if (q.length < 2) { res.json({ students: [] }); return; }
    const students = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { enrollmentNumber: { startsWith: q.toUpperCase(), mode: "insensitive" } },
          { user: { fullName: { contains: q, mode: "insensitive" } } }
        ]
      },
      take: limit,
      orderBy: [{ enrollmentNumber: "asc" }],
      select: { id: true, enrollmentNumber: true, branchCode: true, user: { select: { fullName: true } } }
    });
    res.json({ students });
  } catch (error) { next(error); }
});

studentsRouter.patch("/me", requireRoles("STUDENT"), validate(profileUpdateSchema), async (req, res, next) => {
  try {
    const student = await prisma.student.update({ where: { id: req.authUser!.studentId }, data: { guardianName: req.body.guardianName, guardianPhone: req.body.guardianPhone, user: { update: { phone: req.body.phone } } }, include: { user: { select: { fullName: true, email: true, phone: true } } } });
    res.json({ student });
  } catch (error) { next(error); }
});

studentsRouter.get("/", requireRoles("WARDEN", "SUPER_ADMIN", "STAFF", "GUARD"), async (req, res, next) => {
  try {
    const query = studentListSchema.parse(req.query);
    const where = query.search ? { OR: [{ enrollmentNumber: { contains: query.search, mode: "insensitive" as const } }, { user: { fullName: { contains: query.search, mode: "insensitive" as const } } }] } : {};
    const [students, total] = await Promise.all([
      prisma.student.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { enrollmentNumber: "asc" }, include: { user: { select: { fullName: true, email: true, phone: true } }, allocations: { where: { status: "ACTIVE" }, include: { room: { include: { floor: true } } } } } }),
      prisma.student.count({ where })
    ]);
    res.json({ students, pagination: { page: query.page, pageSize: query.pageSize, total, pages: Math.ceil(total / query.pageSize) } });
  } catch (error) { next(error); }
});
