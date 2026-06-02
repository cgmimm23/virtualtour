// Buyer chatbot for the public tour viewer. Claude answers questions about
// the property using tour metadata + scene names + listing details + agent
// branding. Designed to capture leads naturally — when the buyer mentions
// scheduling, pricing, or contact, the model nudges toward leaving an email.

import "server-only";
import { requireAnthropic, AI_MODEL } from "./client";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatTourContext {
  title: string;
  propertyAddress: string;
  scenes: Array<{
    name: string;
    floor?: string;
    /** Hotspot labels + info text on this scene — agents author these and
        they're often the highest-signal content. */
    hotspots?: Array<{ label: string; info?: string }>;
  }>;
  highlights?: string[];
  agent?: {
    name?: string;
    brokerage?: string;
    email?: string;
    phone?: string;
  };
  details?: {
    beds?: number;
    baths?: number;
    sqft?: number;
    lotSqft?: number;
    yearBuilt?: number;
    listPrice?: number;
    status?: string;
    propertyType?: string;
  };
  /** AI-generated short description (≤200 words). */
  description?: string;
  /** Long-form MLS-style description authored by the agent. */
  mlsDescription?: string;
  /** Agent-curated FAQ. */
  qAndA?: Array<{ q: string; a: string }>;
  /** Server-fetched external listing pages (rentinsa.com, brokerage site). */
  externalSources?: Array<{ url: string; content: string }>;
}

// Per-source content caps so a long listing page doesn't blow past Claude's
// system-prompt sweet spot. ~3K chars ≈ ~750 tokens; with 3 sources max we
// stay well under the cache-control boundary.
const EXTERNAL_SOURCE_CAP = 3000;
const MAX_EXTERNAL_SOURCES = 3;

function buildSystemPrompt(ctx: ChatTourContext): string {
  const lines: string[] = [
    `You are the AI assistant on a real-estate virtual-tour listing for "${ctx.title}".`,
    "",
    "Your job: answer buyer questions about THIS property based on the facts below. Be concise (1-3 sentences usually). Friendly but not chatty. Real estate is a serious purchase.",
    "",
    "PRIORITY ORDER for facts when there's overlap:",
    "  1. AGENT FAQ (verbatim — these are the agent's curated answers, treat as authoritative)",
    "  2. PROPERTY FACTS + AGENT DESCRIPTION",
    "  3. EXTERNAL LISTING SOURCES (cross-reference for additional detail)",
    "  4. ROOM/HOTSPOT data (what's visually present in each scene)",
    "",
    "If asked something you don't know (school district, HOA fees, exact ceiling height, etc.) say so honestly and offer to connect them with the agent. Never invent specifics.",
    "",
    "Lead-capture nudge: if the buyer asks about pricing, scheduling a showing, making an offer, or anything implying genuine interest, naturally suggest leaving their email so the agent can follow up. Don't push if they're just browsing.",
    "",
    "PROPERTY FACTS",
    `Address: ${ctx.propertyAddress || ctx.title}`,
  ];
  if (ctx.details?.listPrice)
    lines.push(`Listed at: $${ctx.details.listPrice.toLocaleString()}`);
  if (ctx.details?.status) lines.push(`Status: ${ctx.details.status}`);
  if (ctx.details?.beds !== undefined) lines.push(`Bedrooms: ${ctx.details.beds}`);
  if (ctx.details?.baths !== undefined) lines.push(`Bathrooms: ${ctx.details.baths}`);
  if (ctx.details?.sqft) lines.push(`Square feet: ${ctx.details.sqft.toLocaleString()}`);
  if (ctx.details?.lotSqft) lines.push(`Lot size: ${ctx.details.lotSqft.toLocaleString()} sqft`);
  if (ctx.details?.yearBuilt) lines.push(`Year built: ${ctx.details.yearBuilt}`);
  if (ctx.details?.propertyType) lines.push(`Type: ${ctx.details.propertyType}`);
  if (ctx.description) {
    lines.push("");
    lines.push("AGENT DESCRIPTION (short)");
    lines.push(ctx.description);
  }
  if (ctx.mlsDescription) {
    lines.push("");
    lines.push("MLS / LONG-FORM DESCRIPTION");
    lines.push(ctx.mlsDescription);
  }
  if (ctx.qAndA && ctx.qAndA.length > 0) {
    lines.push("");
    lines.push("AGENT FAQ (use these answers verbatim when relevant)");
    for (const qa of ctx.qAndA) {
      if (!qa.q?.trim() || !qa.a?.trim()) continue;
      lines.push(`Q: ${qa.q.trim()}`);
      lines.push(`A: ${qa.a.trim()}`);
    }
  }
  if (ctx.externalSources && ctx.externalSources.length > 0) {
    lines.push("");
    lines.push("EXTERNAL LISTING SOURCES (server-fetched, cached)");
    for (const src of ctx.externalSources.slice(0, MAX_EXTERNAL_SOURCES)) {
      if (!src.content?.trim()) continue;
      lines.push(`--- ${src.url} ---`);
      lines.push(src.content.trim().slice(0, EXTERNAL_SOURCE_CAP));
    }
  }
  lines.push("");
  lines.push("ROOMS IN THE TOUR (in order, with hotspots if any)");
  const grouped: Record<string, typeof ctx.scenes> = {};
  for (const s of ctx.scenes) {
    const f = s.floor || "Unsorted";
    grouped[f] = grouped[f] || [];
    grouped[f].push(s);
  }
  for (const [floor, scenes] of Object.entries(grouped)) {
    lines.push(`Floor: ${floor}`);
    for (const s of scenes) {
      lines.push(`  • ${s.name}`);
      if (s.hotspots && s.hotspots.length > 0) {
        for (const h of s.hotspots) {
          const info = h.info?.trim();
          lines.push(`      - ${h.label}${info ? `: ${info}` : ""}`);
        }
      }
    }
  }
  if (ctx.agent?.name) {
    lines.push("");
    lines.push("LISTING AGENT");
    lines.push(`Name: ${ctx.agent.name}`);
    if (ctx.agent.brokerage) lines.push(`Brokerage: ${ctx.agent.brokerage}`);
    if (ctx.agent.email) lines.push(`Email: ${ctx.agent.email}`);
    if (ctx.agent.phone) lines.push(`Phone: ${ctx.agent.phone}`);
  }
  lines.push("");
  lines.push(
    "If the buyer wants to leave their email, ask once politely and confirm when received. Don't repeat the request after they've given it.",
  );
  return lines.join("\n");
}

/**
 * Optional vision attachments for the current turn. The route passes scenes
 * the user just mentioned (case-insensitive substring match against the
 * latest user message) AND haven't been shown earlier in this session, so
 * each scene image is at most one Claude vision call per chat session.
 */
export interface VisionAttachment {
  sceneName: string;
  imageUrl: string;
}

export async function answerBuyerQuestion(
  ctx: ChatTourContext,
  history: ChatTurn[],
  attachments: VisionAttachment[] = [],
): Promise<string> {
  const client = await requireAnthropic();
  const systemPrompt = buildSystemPrompt(ctx);

  const claudeMessages: Array<{
    role: "user" | "assistant";
    content:
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image"; source: { type: "url"; url: string } }
        >;
  }> = history.map((t) => ({ role: t.role, content: t.content }));

  // If there are vision attachments to add for the latest user turn, replace
  // that turn's content with a multi-block array (text + images).
  if (attachments.length > 0 && claudeMessages.length > 0) {
    const last = claudeMessages[claudeMessages.length - 1];
    if (last.role === "user" && typeof last.content === "string") {
      const blocks: Array<
        { type: "text"; text: string } | { type: "image"; source: { type: "url"; url: string } }
      > = [];
      for (const a of attachments) {
        blocks.push({ type: "image", source: { type: "url", url: a.imageUrl } });
        blocks.push({
          type: "text",
          text: `[Above is the "${a.sceneName}" panorama from this tour. Use it to answer questions about that room.]`,
        });
      }
      blocks.push({ type: "text", text: last.content });
      last.content = blocks;
    }
  }

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 400,
    system: [
      {
        // Cache the per-tour system prompt — every message in the same chat
        // session shares it.
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: claudeMessages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
}
