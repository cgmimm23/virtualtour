"use server";

// Server actions for managing tour external_sources — agent-provided URLs
// (rentinsa.com, Zillow, brokerage site, etc.) that we server-fetch, strip to
// readable text, and feed into the buyer chatbot's system prompt.

import { revalidatePath } from "next/cache";
import { parse } from "node-html-parser";
import { authorizeTourAccess } from "./access";
import { prisma } from "@/lib/db";

const MAX_SOURCES = 3;
const MAX_CONTENT_CHARS = 5000; // hard cap on stored content
const FETCH_TIMEOUT_MS = 8000;

interface SourceEntry {
  url: string;
  fetched_at: string;
  content: string;
}

/**
 * Refresh (or initially fetch) one external source for a tour. Replaces the
 * matching entry by URL or appends if it's new.
 */
export async function refreshExternalSource(input: {
  tourId: string;
  url: string;
}): Promise<
  | { ok: true; chars: number; preview: string }
  | { ok: false; error: string }
> {
  const url = input.url.trim();
  if (!isReasonableUrl(url)) {
    return { ok: false, error: "Enter an http(s) URL." };
  }

  const access = await authorizeTourAccess(input.tourId);
  if (!access.ok) return { ok: false, error: access.error };

  let content: string;
  try {
    content = await fetchAndExtract(url);
  } catch (err) {
    return {
      ok: false,
      error: `Couldn't fetch: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
  if (!content.trim()) {
    return {
      ok: false,
      error: "Page loaded but no readable text was found. JS-only renders won't work here.",
    };
  }

  const tour = await prisma.tours.findUnique({
    where: { id: input.tourId },
    select: { external_sources: true },
  });
  const existing: SourceEntry[] = Array.isArray(tour?.external_sources)
    ? (tour!.external_sources as unknown as SourceEntry[])
    : [];

  // Replace matching URL, else append; cap total at MAX_SOURCES.
  const idx = existing.findIndex((s) => s.url === url);
  const entry: SourceEntry = {
    url,
    fetched_at: new Date().toISOString(),
    content: content.slice(0, MAX_CONTENT_CHARS),
  };
  let next: SourceEntry[];
  if (idx >= 0) {
    next = [...existing];
    next[idx] = entry;
  } else {
    if (existing.length >= MAX_SOURCES) {
      return {
        ok: false,
        error: `Max ${MAX_SOURCES} sources. Remove one before adding another.`,
      };
    }
    next = [...existing, entry];
  }

  try {
    await prisma.tours.update({
      where: { id: input.tourId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { external_sources: next as any },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }

  revalidatePath(`/editor/${input.tourId}`);
  return {
    ok: true,
    chars: entry.content.length,
    preview: entry.content.slice(0, 240),
  };
}

export async function removeExternalSource(input: {
  tourId: string;
  url: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await authorizeTourAccess(input.tourId);
  if (!access.ok) return { ok: false, error: access.error };

  const tour = await prisma.tours.findUnique({
    where: { id: input.tourId },
    select: { external_sources: true },
  });
  const existing: SourceEntry[] = Array.isArray(tour?.external_sources)
    ? (tour!.external_sources as unknown as SourceEntry[])
    : [];
  const next = existing.filter((s) => s.url !== input.url);
  if (next.length === existing.length) return { ok: true }; // no-op

  try {
    await prisma.tours.update({
      where: { id: input.tourId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { external_sources: next as any },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }

  revalidatePath(`/editor/${input.tourId}`);
  return { ok: true };
}

function isReasonableUrl(s: string): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchAndExtract(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let html: string;
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // Mimic a normal browser so we don't get HTML-stripped bot-mode pages.
        "user-agent":
          "Mozilla/5.0 (compatible; VITA-LinkPreview/1.0; +https://virtualtour.cgmimm.com)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }
  return extractMainText(html);
}

/**
 * Stringify the most-content-rich portion of an HTML page into a single
 * blob the chatbot can read. Strips nav/header/footer/script/style and
 * collapses whitespace.
 */
function extractMainText(html: string): string {
  const root = parse(html, {
    blockTextElements: { script: false, style: false, noscript: false, pre: true },
  });

  // Drop chrome/noise nodes.
  const drop = ["script", "style", "noscript", "nav", "header", "footer", "iframe", "form", "aside"];
  for (const sel of drop) {
    for (const el of root.querySelectorAll(sel)) el.remove();
  }

  // Prefer <main>, <article>, then [role=main], then <body>.
  const candidates = [
    root.querySelector("main"),
    root.querySelector("article"),
    root.querySelector('[role="main"]'),
    root.querySelector("body"),
    root,
  ];
  const node = candidates.find(Boolean) ?? root;
  const text = (node?.text ?? "").replace(/\s+/g, " ").trim();
  // Add the <title> tag content at the start for context.
  const title = root.querySelector("title")?.text?.trim();
  return title ? `${title}\n\n${text}` : text;
}
