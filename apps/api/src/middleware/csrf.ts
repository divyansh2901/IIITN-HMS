import { randomBytes, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { AppError } from "../shared/errors.js";

export const getOrCreateCsrfToken = (req: { session: { csrfToken?: string } }) => {
  if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString("hex");
  return req.session.csrfToken;
};

export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.path.endsWith("/auth/login")) {
    next();
    return;
  }

  const expected = req.session.csrfToken;
  const received = req.get("X-CSRF-Token");
  if (!expected || !received) {
    next(new AppError(403, "A valid CSRF token is required", "CSRF_INVALID"));
    return;
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    next(new AppError(403, "A valid CSRF token is required", "CSRF_INVALID"));
    return;
  }
  next();
};
