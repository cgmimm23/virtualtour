// /llms.txt — discovery file for LLM agents (ChatGPT, Claude, Perplexity, etc.)
// per the proposal at https://llmstxt.org. A concise, link-rich summary that
// AI agents can read instead of crawling the whole site.

import { ARTICLES_META } from "@/app/(marketing)/guide/_content/meta";
import { prisma } from "@/lib/db";
import { getPricingTiers } from "@/lib/pricing";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";

export const dynamic = "force-dynamic";

export async function GET() {
  const tiers = await getPricingTiers();

  // Pull a few published tours to surface as concrete examples.
  let exampleTours: Array<{ slug: string; title: string }> = [];
  try {
    exampleTours = await prisma.tours.findMany({
      where: { status: "published" },
      select: { slug: true, title: true },
      take: 5,
    });
  } catch {
    exampleTours = [{ slug: "kremmen-place", title: "Kremmen Place" }];
  }

  const text = `# VITA — AI Virtual Tour Creator (by CGMIMM)

> VITA is an AI-powered virtual tour creator for real estate agents. Upload 360° panoramas from any camera, get a branded, lead-capturing virtual tour ready in minutes. Built and operated by CGMIMM.

## What this product does

- Hosts interactive 360° virtual tours of real estate listings.
- Auto-names every room from a 360 panorama using Claude vision (Anthropic).
- Auto-generates doorway hotspots between scenes based on tour order.
- Captures buyer leads via an email gate triggered after 3 scenes or 60 seconds, plus per-scene "Contact agent" hotspots and "Schedule a showing" CTAs.
- Pipes captured leads to the agent's email and to CRMs (Follow Up Boss, kvCORE, Sierra) or Zapier.
- Provides agent branding (name, photo, brokerage, color, logo) on every tour.
- Generates floor-plan mini-maps with clickable scene dots.
- Supports embed mode for placing tours on third-party sites.

## Marketing pages

- [Landing](${BASE_URL}/): What VITA is, how it works, pricing teaser, demo CTA.
- [Pricing](${BASE_URL}/pricing): Three plans — ${tiers.map((t) => `${t.displayName} $${(t.priceCents / 100).toFixed(0)}/mo`).join(", ")}.
- [Guide](${BASE_URL}/guide): Free, opinionated guide to making 360° real-estate tours.

## Live virtual tour examples
${exampleTours.length === 0 ? "(none published yet)" : exampleTours.map((t) => `- [${t.title}](${BASE_URL}/t/${t.slug}?view=1) — interactive 360° virtual tour.`).join("\n")}

## Guide articles
${ARTICLES_META.map((a) => `- [${a.title}](${BASE_URL}/guide/${a.slug}) — ${a.description}`).join("\n")}

## Account / app

- Sign up (free 14-day trial, no card): ${BASE_URL}/signup
- Sign in: ${BASE_URL}/login

## Tech / integration notes

- Public tour viewer URL pattern: ${BASE_URL}/t/{slug}?view=1
- Embed iframe URL pattern: ${BASE_URL}/t/{slug}?embed=1
- Lead webhooks fire client-side and server-side — Zapier-compatible JSON payloads.
- Hosting: Digital Ocean App Platform; data layer Supabase Postgres with RLS.

## Contact

- Operator: CGMIMM (https://www.cgmimm.com)
- Sister site: AI SEO by CGMIMM (https://seo.cgmimm.com)
`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
