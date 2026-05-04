// Session-refresh helper used by the root middleware.ts.
//
// Supabase auth tokens expire; without this refresh, server-rendered pages
// fall out of sync with the client and you get the dreaded "logged in on the
// client, logged out on the server" flicker. The pattern is straight from
// https://supabase.com/docs/guides/auth/server-side/nextjs.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";
import type { Database } from "@/types/supabase";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Triggers a refresh if the access token is expired. Don't read user data
  // from this call — it's just here to keep cookies fresh.
  await supabase.auth.getUser();

  return response;
}
