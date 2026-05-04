// POST /auth/signout — clears the Supabase session cookie and redirects home.
// POST-only so links + GET prefetches don't accidentally sign people out.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), {
    status: 303,
  });
}
