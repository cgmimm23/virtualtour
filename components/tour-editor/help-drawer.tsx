"use client";

import { useEffect, useState } from "react";
import {
  ARTICLES_META,
  getArticlesMetaByContext,
  type ArticleMetaLite,
  type EditorContext,
} from "@/app/(marketing)/guide/_content/meta";

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Which editor area is currently active — drives the suggested-articles list. */
  activeContext?: EditorContext;
}

const TIPS: Record<EditorContext, { title: string; body: string }> = {
  editor: {
    title: "The 60-second editor flow",
    body:
      "Drop your equirect JPGs into the sidebar. Reorder scenes by dragging. In Editing mode, click the panorama to drop a hotspot, drag to nudge, ⌫ to delete. ⌘Z undoes. Set the opening view by dragging the panorama in Edit mode — it auto-saves.",
  },
  scenes: {
    title: "Working with scenes",
    body:
      "Scene order in the sidebar is the order viewers walk through. Star a scene to make it the cover (used as the social-share preview). Right-click → Replace photo to swap a scene without losing its hotspots.",
  },
  hotspots: {
    title: "Hotspots that don't feel amateur",
    body:
      "Place scene-link hotspots low (at the floor, not chest height) — viewers' brains read low markers as 'walk there'. Always add a return hotspot back to the previous scene. Auto-link → builds a forward path through every scene from your sidebar order.",
  },
  branding: {
    title: "Branding sticks across listings",
    body:
      "Set headshot, brokerage, phone, and email once — every new tour you create inherits them. Override per-tour only when needed (co-listings, luxury). Use a transparent PNG logo, ideally horizontal aspect.",
  },
  leads: {
    title: "Gate copy is the conversion lever",
    body:
      "Default trigger of 3 scenes / 30 seconds works for most listings. Lower trigger = more captures but more annoyance. Required phone field cuts submissions ~30% and roughly doubles per-lead close rate. Don't gate the cover scene.",
  },
  viewer: {
    title: "Sharing the published tour",
    body:
      "Append ?view=1 to share the public viewer. Append ?nobrand=1 for MLS syndication fields that disallow agent branding. The URL produces a clean social-share preview when pasted into iMessage, Slack, or LinkedIn.",
  },
};

export function HelpDrawer({ open, onClose, activeContext = "editor" }: HelpDrawerProps) {
  const [escClosed, setEscClosed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEscClosed(true);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tip = TIPS[activeContext];
  const suggested = getArticlesMetaByContext(activeContext);
  const others = ARTICLES_META.filter((a) => !suggested.some((s) => s.slug === a.slug));

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        role="dialog"
        aria-label="Help"
      >
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 p-5 dark:border-neutral-800">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
              Help
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Tips for what you're doing now
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Press <kbd className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">Esc</kbd> to close
              {escClosed ? "" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label="Close help"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <section className="border-b border-neutral-200 p-5 dark:border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {tip.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {tip.body}
            </p>
          </section>

          {suggested.length > 0 ? (
            <section className="border-b border-neutral-200 p-5 dark:border-neutral-800">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Relevant chapters
              </h3>
              <ul className="mt-3 space-y-2">
                {suggested.map((a) => (
                  <ArticleLink key={a.slug} article={a} highlight />
                ))}
              </ul>
            </section>
          ) : null}

          <section className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Full guide
            </h3>
            <p className="mt-2 text-xs text-neutral-500">
              {ARTICLES_META.length} chapters, ~
              {ARTICLES_META.reduce((n, a) => n + a.readMinutes, 0)} min total.
            </p>
            <ul className="mt-3 space-y-2">
              {others.map((a) => (
                <ArticleLink key={a.slug} article={a} />
              ))}
            </ul>
            <a
              href="/guide"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block rounded-md border border-neutral-200 bg-white px-3 py-2 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              Open the full guide ↗
            </a>
          </section>
        </div>
      </aside>
    </>
  );
}

function ArticleLink({ article, highlight }: { article: ArticleMetaLite; highlight?: boolean }) {
  return (
    <li>
      <a
        href={`/guide/${article.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${
          highlight
            ? "border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:border-amber-800 dark:hover:bg-amber-950/40"
            : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {article.title}
            </div>
            <span className="flex-shrink-0 text-[10px] uppercase tracking-wider text-neutral-400">
              {article.readMinutes}m
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{article.description}</p>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 flex-shrink-0 text-neutral-400 group-hover:text-amber-600 dark:group-hover:text-amber-400"
        >
          <path d="M7 17L17 7" />
          <path d="M7 7h10v10" />
        </svg>
      </a>
    </li>
  );
}
