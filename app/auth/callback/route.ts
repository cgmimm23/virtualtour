// Email confirmation / OAuth callback. Supabase appends `?code=...` to the
// emailRedirectTo URL; we exchange it for a session and bounce to the
// post-signup destination. When the signup action threaded ?welcome=1
// onto the redirect, we also fire the welcome email out-of-band.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/welcome";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const welcome = url.searchParams.get("welcome") === "1";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (welcome && data.user?.email) {
        const firstName =
          (data.user.user_metadata?.first_name as string | undefined) ??
          (data.user.user_metadata?.name as string | undefined)?.split(" ")[0] ??
          data.user.email.split("@")[0];
        // Fire-and-forget; don't block the redirect on Resend.
        sendWelcomeEmail({ to: data.user.email, firstName }).catch((err) =>
          console.error("[auth/callback] welcome email failed:", err),
        );
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback", url.origin));
}
