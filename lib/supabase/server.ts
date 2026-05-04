// Server-side Supabase client for Server Components, Route Handlers, and
// Server Actions. Reads/writes the auth cookie via Next.js cookies().
//
// Use this for any DB access that should run as the signed-in user (RLS
// enforces team scoping). For ops that must bypass RLS (webhook handlers,
// public RPCs, admin tasks) use lib/supabase/admin.ts.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";
import type { Database } from "@/types/supabase";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll throws when called from a Server Component (read-only).
          // The middleware refresh path covers this case — safe to ignore here.
        }
      },
    },
  });
}
