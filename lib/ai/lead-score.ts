// Lead scoring. Looks at the lead's behavior signals and returns a 0-100
// score with a one-sentence rationale. Higher = more likely to convert.

import "server-only";
import { requireAnthropic, AI_MODEL } from "./client";

export interface LeadInputs {
  name?: string | null;
  email: string;
  phone?: string | null;
  preferredTime?: string | null;
  source: string;
  scenesViewed: number;
  totalScenes: number;
  durationMs: number;
  capturedAt: string;
  // Number of leads this email already had on the same listing — repeat
  // visitors are stronger signals.
  priorLeadsForEmail?: number;
  // Time-of-day buyer captured at, in property-local timezone (ISO).
  property?: { listPrice?: number; status?: string };
}

export interface LeadScore {
  score: number; // 0-100
  reason: string; // 1-sentence rationale
  bucket: "hot" | "warm" | "cold";
}

const SYSTEM_PROMPT = `You score real-estate buyer leads on conversion likelihood: 0 (browser, never converts) to 100 (extremely likely to take an agent meeting within a week).

Signal weights (rough guidance — combine, don't add mechanically):
- Source: schedule (someone who asked to see the property in person) > in_scene_contact > contact_button > gate (just the email-gate). Schedule is the strongest signal.
- Engagement: scenesViewed/totalScenes ratio + duration. Watching 80% of the tour for 10+ minutes is much stronger than dropping off at the email gate.
- Phone provided: meaningfully positive. People who give phone are more committed.
- Preferred showing time provided: very strong.
- Repeat lead from same email on same listing: very strong (they came back).
- Listed status: "for_sale" leads score highest. "pending" leads still useful for backup offers.

Return ONLY valid JSON: {"score": <0-100 integer>, "reason": "<one sentence>"} — no markdown, no prose.`;

export async function scoreLead(input: LeadInputs): Promise<LeadScore> {
  const client = await requireAnthropic();

  const facts = [
    `Source: ${input.source}`,
    `Email: ${input.email}`,
    `Name provided: ${input.name ? "yes" : "no"}`,
    `Phone provided: ${input.phone ? "yes" : "no"}`,
    `Preferred time provided: ${input.preferredTime ? `yes (${input.preferredTime})` : "no"}`,
    `Engagement: viewed ${input.scenesViewed}/${input.totalScenes} scenes over ${Math.round(
      input.durationMs / 1000,
    )} seconds`,
    `Captured at: ${input.capturedAt}`,
    `Prior leads from this email on this listing: ${input.priorLeadsForEmail ?? 0}`,
    input.property?.listPrice ? `List price: $${input.property.listPrice.toLocaleString()}` : "",
    input.property?.status ? `Listing status: ${input.property.status}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 256,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Score this lead.\n\n${facts}\n\nReturn JSON only.` }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseScore(raw);
}

function parseScore(raw: string): LeadScore {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  let score = 50;
  let reason = "Could not parse model output.";
  if (start !== -1 && end !== -1) {
    try {
      const obj = JSON.parse(raw.slice(start, end + 1)) as { score?: unknown; reason?: unknown };
      if (typeof obj.score === "number") {
        score = Math.max(0, Math.min(100, Math.round(obj.score)));
      }
      if (typeof obj.reason === "string") reason = obj.reason.trim().slice(0, 300);
    } catch {
      // fall through with defaults
    }
  }
  const bucket: LeadScore["bucket"] = score >= 75 ? "hot" : score >= 45 ? "warm" : "cold";
  return { score, reason, bucket };
}
