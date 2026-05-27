"use client";

// Share & publish controls for a single tour. Toggles tours.status between
// 'draft' and 'published' and surfaces the canonical public URL so the agent
// can copy it for MLS / email / DMs without leaving the editor.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTourStatus } from "@/lib/tour/actions";

interface ShareModalProps {
  tourId: string;
  slug: string;
  initialStatus: "draft" | "published";
  open: boolean;
  onClose: () => void;
}

export function ShareModal({ tourId, slug, initialStatus, open, onClose }: ShareModalProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"draft" | "published">(initialStatus);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/t/${slug}`
      : `/t/${slug}`;

  const handleToggle = () => {
    const next = status === "published" ? "draft" : "published";
    startTransition(async () => {
      try {
        await setTourStatus(tourId, next);
        setStatus(next);
        router.refresh();
      } catch (err) {
        window.alert(`Couldn't update status: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const isPublished = status === "published";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Share this tour</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Published tours are visible at the link below. Drafts return a 404 so you
              can build privately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">Status</div>
            <div className="mt-0.5 text-sm font-medium">
              {isPublished ? (
                <span className="text-emerald-700 dark:text-emerald-400">Published</span>
              ) : (
                <span className="text-neutral-700 dark:text-neutral-300">Draft</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={pending}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white transition ${
              isPublished
                ? "bg-neutral-800 hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                : "bg-emerald-600 hover:bg-emerald-700"
            } disabled:opacity-50`}
          >
            {pending ? "Saving…" : isPublished ? "Unpublish" : "Publish"}
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">Share link</span>
          <div className="mt-1 flex gap-2">
            <input
              readOnly
              value={publicUrl}
              onClick={(e) => e.currentTarget.select()}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {!isPublished ? (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Tour is in draft — anyone visiting this link will see a 404. Hit Publish first.
            </p>
          ) : null}
        </label>
      </div>
    </div>
  );
}
