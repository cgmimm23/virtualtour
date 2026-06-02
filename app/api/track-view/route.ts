// POST /api/track-view — public viewer pings this once per session on
// /t/[slug] load. Hits the track_tour_view RPC which dedups per-session-
// per-day and bumps tours.view_count.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const Body = z.object({
  slug: z.string().min(1).max(120),
  sessionId: z.string().min(8).max(128),
  referrer: z.string().max(2048).optional(),
});

function inferDevice(ua: string | null): string | null {
  if (!ua) return null;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobile|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const country = req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country");
  const device = inferDevice(req.headers.get("user-agent"));

  const { data, error } = await supabase.rpc("track_tour_view", {
    p_tour_slug: parsed.data.slug,
    p_session_id: parsed.data.sessionId,
    p_referrer: parsed.data.referrer ?? null,
    p_country: country ?? null,
    p_device: device ?? null,
  });
  if (error) {
    console.error("[track-view] rpc failed:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, counted: Boolean(data) });
}
