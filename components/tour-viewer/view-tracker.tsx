"use client";

// Fire-and-forget /api/track-view ping on first paint of a public tour.
// One ping per session id; the server dedups per UTC day. Hidden under
// the viewer so it doesn't affect render.

import { useEffect } from "react";

const SESSION_KEY = "vita-viewer-session-id";

function readSessionId(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing && existing.length >= 8) return existing;
  } catch {
    // localStorage can throw in private mode — fall through to generate.
  }
  const fresh =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    window.localStorage.setItem(SESSION_KEY, fresh);
  } catch {
    /* ignore */
  }
  return fresh;
}

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const sessionId = readSessionId();
    const referrer = document.referrer || undefined;
    void fetch("/api/track-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, sessionId, referrer }),
      keepalive: true,
    }).catch(() => {
      // Analytics is best-effort; never bother the viewer.
    });
  }, [slug]);
  return null;
}
