// Lead utilities: scoring, CSV export, optional outbound webhook, and the
// per-session "gate passed" cache. Persistence lives elsewhere now —
// `lib/tour/lead-actions.ts` for server-side, RPC-backed mutations.

import type { Lead } from "./types";

export function leadsToCsv(leads: Lead[]): string {
  const headers = [
    "captured_at",
    "email",
    "name",
    "phone",
    "preferred_time",
    "source",
    "scenes_viewed",
    "duration_ms",
    "score",
    "score_label",
    "tour_slug",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const l of leads) {
    const s = leadScore(l);
    lines.push(
      [
        l.capturedAt,
        l.email,
        l.name ?? "",
        l.phone ?? "",
        l.preferredTime ?? "",
        l.source,
        String(l.scenesViewed),
        String(l.durationMs),
        String(s),
        leadScoreLabel(s),
        l.tourSlug,
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}

/**
 * Heuristic 0–100 score blending engagement and intent signals.
 *  - Up to 60 points for scenes viewed (caps at 12 scenes for max).
 *  - Up to 25 points for session duration (caps at ~8 minutes).
 *  - +10 for an explicitly captured phone number.
 *  - +5 bonus for a `schedule` source (highest-intent capture).
 */
export function leadScore(lead: Lead): number {
  const sceneScore = Math.min(60, lead.scenesViewed * 5);
  const durationMin = lead.durationMs / 60_000;
  const timeScore = Math.min(25, durationMin * 3);
  const phoneScore = lead.phone ? 10 : 0;
  const intentBonus = lead.source === "schedule" ? 5 : 0;
  return Math.min(100, Math.round(sceneScore + timeScore + phoneScore + intentBonus));
}

export type LeadScoreLabel = "hot" | "warm" | "cool";

export function leadScoreLabel(score: number): LeadScoreLabel {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cool";
}

/**
 * Fire-and-forget POST to a tour-configured webhook (e.g. Zapier catch-hook).
 * No await — failures are silent; we never want a flaky third-party endpoint
 * to break the lead-capture UX.
 */
export function fireLeadWebhook(webhookUrl: string | undefined, lead: Lead): void {
  if (!webhookUrl) return;
  if (typeof window === "undefined") return;
  try {
    void fetch(webhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, score: leadScore(lead) }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export function hasGateBeenPassed(slug: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(`tourly:gatepassed:${slug}`) === "1";
}

export function markGatePassed(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`tourly:gatepassed:${slug}`, "1");
  } catch {
    // ignore
  }
}
