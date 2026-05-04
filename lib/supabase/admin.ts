// Service-role Supabase client. Bypasses RLS — use sparingly:
//   - Stripe webhook handlers (no user context)
//   - Public RPCs that need to read across teams (e.g. published-tour fetch
//     for /t/[slug] when there's no signed-in user)
//   - Admin scripts / seed
//
// NEVER import this into a client component. The service role key must stay
// server-side. The "import 'server-only'" line below makes a build break loud
// if anyone tries.

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";
import type { Database } from "@/types/supabase";

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (cached) return cached;
  cached = createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
