// Root middleware. Job 1 is refreshing the Supabase session cookie. Job 2 is
// gating /dashboard behind auth — public marketing pages and /t/[slug] are
// always accessible.

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  // Bail out gracefully if Supabase isn't configured (e.g. in early prod
  // before the env vars are set). Auth-gated pages will redirect to /login
  // and the login page will display its own missing-env error.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let response: NextResponse;
  try {
    response = await updateSession(request);
  } catch {
    // If the Supabase session refresh blows up, don't 500 the whole site —
    // public marketing + /t/[slug] don't need auth.
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/admin")
  ) {
    try {
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
    } catch {
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
    "/((?!api/|_next/static|_next/image|favicon.ico|tours/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
