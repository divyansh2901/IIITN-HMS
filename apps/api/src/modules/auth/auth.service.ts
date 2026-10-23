import bcrypt from "bcryptjs";
import type { Request } from "express";
import { prisma } from "../../db/prisma.js";
import { unauthorized } from "../../shared/errors.js";
import type { AuthenticatedUser, RoleCode } from "../../shared/types.js";
import { getOrCreateCsrfToken } from "../../middleware/csrf.js";

const toSafeUser = (user: {
  id: string; email: string; fullName: string; phone: string | null; status: "ACTIVE" | "INACTIVE";
  createdAt: Date; updatedAt: Date; roles: { role: { code: string } }[]; student?: { id: string } | null; staff?: { id: string } | null;
}): AuthenticatedUser => ({
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
});

export const login = async (req: Request, email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } }, student: true, staff: true }
  });
  if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized("Invalid email or password");
  }

  await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.userId = user.id;
  const csrfToken = getOrCreateCsrfToken(req);
  await new Promise<void>((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
  return { user: toSafeUser(user), csrfToken };
};

export const currentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } }, student: true, staff: true }
  });
  if (!user || user.status !== "ACTIVE") throw unauthorized("Your account is inactive or your session has expired");
  return toSafeUser(user);
};

export const logout = async (req: Request) => {
  await new Promise<void>((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
};
