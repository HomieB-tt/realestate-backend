/**
 * Centralized, fail-fast environment configuration.
 * The process refuses to start if a required variable is missing —
 * this surfaces misconfiguration at boot instead of at first request.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8080),

  // Supabase project config
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
  // Service role key: server-side ONLY. Never send to clients.
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  // JWKS endpoint used to verify incoming user JWTs.
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL
    ?? `${requireEnv('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`,

  // Direct Postgres connection (needed for explicit BEGIN/COMMIT/FOR UPDATE
  // transactions — the Supabase JS client does not expose raw transactions).
  databaseUrl: requireEnv('DATABASE_URL'),
} as const;
