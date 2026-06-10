// POST /api/track-view — public viewer pings this once per session on
// /t/[slug] load. Hits the track_tour_view RPC which dedups per-session-
// per-day and bumps tours.view_count.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

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

  const country = req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country");
  const device = inferDevice(req.headers.get("user-agent"));

  try {
    // Calls the existing track_tour_view(...) Postgres function, which dedups
    // per-session-per-day and bumps tours.view_count. Named args mapped to
    // positional via the SQL call signature below.
    const rows = await prisma.$queryRaw<Array<{ track_tour_view: boolean }>>`
      SELECT track_tour_view(
        ${parsed.data.slug}::text,
        ${parsed.data.sessionId}::text,
        ${parsed.data.referrer ?? null}::text,
        ${country ?? null}::text,
        ${device ?? null}::text
      ) AS track_tour_view
    `;
    const counted = Boolean(rows[0]?.track_tour_view);
    return NextResponse.json({ ok: true, counted });
  } catch (err) {
    console.error("[track-view] rpc failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
