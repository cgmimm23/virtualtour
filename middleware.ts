// Root middleware. Gates /dashboard, /editor, /admin behind a NextAuth session.
// Public marketing pages and /t/[slug] are always accessible. JWT sessions need
// no server-side refresh, so this only runs on the protected prefixes.

import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/editor/:path*", "/admin/:path*"],
};
