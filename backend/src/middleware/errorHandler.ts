import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, "Route not found"));
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  res.status(statusCode).json({ message: err.message || "Server error" });
}