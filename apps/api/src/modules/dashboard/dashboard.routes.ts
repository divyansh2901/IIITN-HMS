import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get("/overview", requireRoles("WARDEN", "SUPER_ADMIN"), async (_req, res, next) => {
  try {
    const [rooms, occupied, pendingLeaves, openComplaints, equipment, outstandingReturns, recentAudit] = await Promise.all([
      prisma.room.count(),
      prisma.roomAllocation.count({ where: { status: "ACTIVE" } }),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.complaint.count({ where: { status: { in: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"] } } }),
      prisma.equipment.aggregate({ _sum: { totalQuantity: true, availableQuantity: true } }),
      prisma.equipmentIssue.count({ where: { status: "ISSUED" } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { fullName: true } } } })
    ]);
    const capacity = await prisma.room.aggregate({ _sum: { capacity: true } });
    res.json({
      rooms: { total: rooms, capacity: capacity._sum.capacity ?? 0, occupied, vacant: Math.max((capacity._sum.capacity ?? 0) - occupied, 0) },
      pendingLeaves,
      openComplaints,
      equipment: { total: equipment._sum.totalQuantity ?? 0, available: equipment._sum.availableQuantity ?? 0 },
      outstandingReturns,
      recentAudit
    });
  } catch (error) { next(error); }
});

dashboardRouter.get("/student", requireRoles("STUDENT"), async (req, res, next) => {
  try {
    const studentId = req.authUser?.studentId;
    if (!studentId) { res.json({ student: null, allocation: null }); return; }
    const [student, allocation, leaveSummary, complaintSummary, notices] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId }, include: { user: { select: { fullName: true, email: true, phone: true } } } }),
      prisma.roomAllocation.findFirst({ where: { studentId, status: "ACTIVE" }, include: { room: { include: { floor: true } } } }),
      prisma.leaveRequest.groupBy({ by: ["status"], where: { studentId }, _count: true }),
      prisma.complaint.groupBy({ by: ["status"], where: { studentId }, _count: true }),
      prisma.notice.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" }, take: 5 })
    ]);
    res.json({ student, allocation, leaveSummary, complaintSummary, notices });
  } catch (error) { next(error); }
});
