// Browser Supabase client. Used from "use client" components for things like
// auth listeners. DB writes from the client are *intentionally* not supported —
// all mutations go through Server Actions so we get input validation + RLS
// enforced by the auth cookie.

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";
import type { Database } from "@/types/supabase";

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
