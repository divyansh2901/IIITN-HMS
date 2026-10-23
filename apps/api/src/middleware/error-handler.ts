import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Please correct the highlighted fields.",
      code: "VALIDATION_ERROR",
      details: error.flatten().fieldErrors,
      requestId: req.requestId
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details,
      requestId: req.requestId
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: "An unexpected server error occurred.",
    code: "INTERNAL_ERROR",
    requestId: req.requestId
  });
};
