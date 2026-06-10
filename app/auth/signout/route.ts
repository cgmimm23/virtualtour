// POST /auth/signout — clears the NextAuth session cookie and redirects home.
// POST-only so links + GET prefetches don't accidentally sign people out.

import { NextResponse, type NextRequest } from "next/server";

function publicOrigin(request: NextRequest): string {
  // Behind DO App Platform we run on localhost:8080 inside the container, but
  // the public URL comes in via x-forwarded-host / x-forwarded-proto. Prefer
  // those, then NEXT_PUBLIC_APP_URL, then the request origin.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", publicOrigin(request)), { status: 303 });
  // Clear both the secure (prod) and plain (dev) NextAuth session cookies.
  for (const name of [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ]) {
    res.cookies.set(name, "", { path: "/", expires: new Date(0) });
  }
  return res;
}
