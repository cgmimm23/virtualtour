"use client";

import { useEffect, useRef, useState } from "react";

interface BuyerChatProps {
  tourSlug: string;
  agentName?: string;
  agentPhotoUrl?: string;
  primaryColor?: string;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

const SESSION_KEY = (slug: string) => `vita:chat:session:${slug}`;
const HISTORY_KEY = (slug: string) => `vita:chat:history:${slug}`;
const EMAIL_KEY = (slug: string) => `vita:chat:email:${slug}`;

function newSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function BuyerChat({ tourSlug, agentName, agentPhotoUrl, primaryColor }: BuyerChatProps) {
  const accent = primaryColor ?? "#205081";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const sessionIdRef = useRef<string>("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Hydrate session + history from localStorage on first open.
  useEffect(() => {
    if (!open) return;
    try {
      const existingSession = window.localStorage.getItem(SESSION_KEY(tourSlug));
      if (existingSession) {
        sessionIdRef.current = existingSession;
      } else {
        sessionIdRef.current = newSessionId();
        window.localStorage.setItem(SESSION_KEY(tourSlug), sessionIdRef.current);
      }
      const savedHistory = window.localStorage.getItem(HISTORY_KEY(tourSlug));
      if (savedHistory) {
        setMessages(JSON.parse(savedHistory) as Msg[]);
      } else {
        setMessages([
          {
            role: "assistant",
            content: agentName
              ? `Hi! I'm ${agentName}'s AI assistant. Ask me anything about this listing — square footage, features, neighborhood, or to schedule a showing.`
              : "Hi! I'm the AI assistant for this listing. Ask me anything — square footage, features, neighborhood, or to schedule a showing.",
          },
        ]);
      }
      const savedEmail = window.localStorage.getItem(EMAIL_KEY(tourSlug));
      if (savedEmail) setEmail(savedEmail);
    } catch {
      // localStorage disabled — chat still works ephemerally
      sessionIdRef.current = newSessionId();
    }
  }, [open, tourSlug, agentName]);

  // Persist history.
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      window.localStorage.setItem(HISTORY_KEY(tourSlug), JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, tourSlug]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, pending]);

  const send = async (text: string, attachedEmail?: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourSlug,
          sessionId: sessionIdRef.current,
          message: trimmed,
          email: attachedEmail ?? email ?? undefined,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error ?? "no reply");
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply! }]);
      // Show the email prompt on the 3rd user message (post-warmup nudge).
      const userMessageCount = messages.filter((m) => m.role === "user").length + 1;
      if (!email && userMessageCount === 2) {
        setShowEmailPrompt(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Sorry — I hit an error (${msg}). Please reach out to the agent directly using the contact button.`,
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const submitEmail = (form: FormData) => {
    const e = (form.get("email") as string)?.trim();
    if (!e) return;
    setEmail(e);
    try {
      window.localStorage.setItem(EMAIL_KEY(tourSlug), e);
    } catch {
      // ignore
    }
    setShowEmailPrompt(false);
    void send(`(My email is ${e} — please pass it along to the agent.)`, e);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-2xl transition-transform hover:scale-105"
        style={{ background: accent }}
        aria-label="Open AI chat about this property"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        Ask AI about this home
      </button>
    );
  }

  return (
    <div className="pointer-events-auto flex h-[70vh] max-h-[600px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl">
      <header
        className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3"
        style={{ background: accent, color: "white" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {agentPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agentPhotoUrl}
              alt=""
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              AI
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {agentName ? `${agentName}'s assistant` : "AI assistant"}
            </div>
            <div className="text-[10px] opacity-80">Powered by VITA</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="-mr-1 rounded-full p-1 text-white/90 hover:bg-white/15"
          aria-label="Close chat"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </header>

      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 px-4 py-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "rounded-br-md bg-neutral-900 text-white"
                  : "rounded-bl-md border border-neutral-200 bg-white text-neutral-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {pending ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-neutral-400" />{" "}
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-neutral-400 [animation-delay:150ms]" />{" "}
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-neutral-400 [animation-delay:300ms]" />
            </div>
          </div>
        ) : null}
      </div>

      {showEmailPrompt ? (
        <form
          action={submitEmail}
          className="border-t border-neutral-200 bg-neutral-50 p-3 text-xs"
        >
          <p className="mb-2 text-neutral-700">
            Drop your email and the agent will follow up with answers + similar listings.
          </p>
          <div className="flex gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
            />
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
              style={{ background: accent }}
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => setShowEmailPrompt(false)}
              className="text-xs text-neutral-500 hover:text-neutral-900"
              aria-label="Skip"
            >
              Skip
            </button>
          </div>
        </form>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-neutral-200 bg-white p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this home…"
          disabled={pending}
          className="flex-1 rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-40"
          style={{ background: accent }}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="m22 2-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
