import { Request, Response, NextFunction } from 'express';
import { DomainValidationError } from '../../../domain/entities/profile.entity';
import { ViewingSlotConflictError } from '../../../domain/entities/viewing.entity';

/**
 * Single place where domain/application errors are translated into HTTP
 * responses. Keeps controllers free of try/catch boilerplate for known
 * error types — they can just `next(err)`.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof DomainValidationError) {
    res.status(400).json({ error: 'validation_error', message: err.message });
    return;
  }

  if (err instanceof ViewingSlotConflictError) {
    res.status(409).json({ error: 'slot_conflict', message: err.message });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: 'not_found', message: err.message });
    return;
  }

  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: 'forbidden', message: err.message });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled_error]', err);
  res.status(500).json({ error: 'internal_error', message: 'An unexpected error occurred' });
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Wraps async Express handlers so rejected promises reach errorHandler via next(). */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
