import type { User } from "@prisma/client";

export type RoleCode = "STUDENT" | "WARDEN" | "GUARD" | "STAFF" | "SUPER_ADMIN";

export type AuthenticatedUser = Omit<User, "passwordHash"> & {
  roles: RoleCode[];
  studentId?: string;
  staffId?: string;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    csrfToken?: string;
  }
}
