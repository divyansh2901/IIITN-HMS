import type { RequestHandler } from "express";
import { prisma } from "../db/prisma.js";
import { forbidden, unauthorized } from "../shared/errors.js";
import type { AuthenticatedUser, RoleCode } from "../shared/types.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) throw unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } }, student: true, staff: true }
    });
    if (!user || user.status !== "ACTIVE") throw unauthorized("Your account is inactive or your session has expired");

    const authenticated: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map(({ role }) => role.code as RoleCode),
      studentId: user.student?.id,
      staffId: user.staff?.id
    };
    req.authUser = authenticated;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRoles = (...allowed: RoleCode[]): RequestHandler => (req, _res, next) => {
  if (!req.authUser || !req.authUser.roles.some((role) => allowed.includes(role))) {
    next(forbidden());
    return;
  }
  next();
};
