// Root middleware. Job 1 is refreshing the Supabase session cookie. Job 2 is
// gating /dashboard behind auth — public marketing pages and /t/[slug] are
// always accessible.

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // Auth gate for /dashboard. We re-derive the user from the (just-refreshed)
  // cookies on the response — can't reuse the supabase client from
  // updateSession because it's scoped inside that function.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/editor")) {
    const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op here — the response already has fresh cookies from updateSession.
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Skip static assets, API routes (they handle auth themselves), and Next
  // internals. Auth refresh runs on everything else.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|tours/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
