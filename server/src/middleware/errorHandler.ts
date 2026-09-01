import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  errors?: unknown[];
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || undefined,
  });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
}
