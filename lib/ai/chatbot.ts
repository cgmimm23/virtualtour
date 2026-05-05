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
  scenes: Array<{ name: string; floor?: string }>;
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
  description?: string;
}

function buildSystemPrompt(ctx: ChatTourContext): string {
  const lines: string[] = [
    `You are the AI assistant on a real-estate virtual-tour listing for "${ctx.title}".`,
    "",
    "Your job: answer buyer questions about THIS property based on the facts below. Be concise (1-3 sentences usually). Friendly but not chatty. Real estate is a serious purchase.",
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
    lines.push("Property description:");
    lines.push(ctx.description);
  }
  lines.push("");
  lines.push("ROOMS IN THE TOUR (in order):");
  const grouped: Record<string, string[]> = {};
  for (const s of ctx.scenes) {
    const f = s.floor || "Unsorted";
    grouped[f] = grouped[f] || [];
    grouped[f].push(s.name);
  }
  for (const [floor, names] of Object.entries(grouped)) {
    lines.push(`${floor}: ${names.join(", ")}`);
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

export async function answerBuyerQuestion(
  ctx: ChatTourContext,
  history: ChatTurn[],
): Promise<string> {
  const client = await requireAnthropic();
  const systemPrompt = buildSystemPrompt(ctx);

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
    messages: history.map((t) => ({ role: t.role, content: t.content })),
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
}
