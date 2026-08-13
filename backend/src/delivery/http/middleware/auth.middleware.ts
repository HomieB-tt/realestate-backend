import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { env } from '../../../config/env';
import { UserRole } from '../../../domain/entities/profile.entity';

export interface AuthContext {
  userId: string;
  role: UserRole;
  email: string | null;
}

// Express Request augmentation so `req.auth` is typed everywhere downstream.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

// JWKS is fetched once and cached/refreshed internally by `jose`.
const jwks = createRemoteJWKSet(new URL(env.supabaseJwksUrl));

interface SupabaseJwtPayload extends JWTPayload {
  email?: string;
  role?: string; // Supabase's built-in 'authenticated' role claim (NOT our app role)
  user_role?: string; // custom claim, if configured via Supabase Auth Hooks
}

/**
 * Verifies the `Authorization: Bearer <token>` header against Supabase's
 * public JWKS. On success, populates `req.auth`. On failure, responds
 * 401 immediately — no downstream handler runs.
 *
 * Note: this checks *authentication* only. Role-based *authorization*
 * (e.g. "must be an agent") is enforced by `requireRole()` below, applied
 * per-route, and ultimately backstopped by RLS at the database layer.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const { payload } = await jwtVerify<SupabaseJwtPayload>(token, jwks, {
      issuer: `${env.supabaseUrl}/auth/v1`,
    });

    if (!payload.sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Token missing subject claim' });
      return;
    }

    req.auth = {
      userId: payload.sub,
      // Fall back to 'client' if no custom role claim is present; the
      // authoritative role still comes from `profiles.role` in the DB
      // for anything security-sensitive — this claim is a fast-path hint.
      role: (payload.user_role as UserRole) ?? 'client',
      email: payload.email ?? null,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

/**
 * Route guard factory: rejects with 403 if the authenticated user's role
 * (as resolved from the DB by the caller, ideally via a fresh profile
 * lookup rather than trusting the JWT claim alone) is not in `roles`.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: 'forbidden', message: `Requires one of roles: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}
