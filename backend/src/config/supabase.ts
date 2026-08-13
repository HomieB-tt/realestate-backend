import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Server-side Supabase client authenticated with the SERVICE ROLE key.
 * This bypasses RLS, so it must only ever be used from trusted backend
 * code AFTER our own auth middleware has verified the caller's identity
 * and the usecase layer has authorized the specific operation.
 *
 * Never expose this client or the service role key to any client app.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
