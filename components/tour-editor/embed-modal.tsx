"use client";

import { useEffect, useState } from "react";

interface EmbedModalProps {
  tourSlug: string;
  onClose: () => void;
}

const SIZES = [
  { label: "Responsive 16:9", value: "responsive" as const },
  { label: "640 × 360", value: "640x360" as const },
  { label: "960 × 540", value: "960x540" as const },
  { label: "1280 × 720", value: "1280x720" as const },
];

export function EmbedModal({ tourSlug, onClose }: EmbedModalProps) {
  const [size, setSize] = useState<(typeof SIZES)[number]["value"]>("responsive");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const url = `${origin}/t/${tourSlug}?embed=1`;
  const directUrl = `${origin}/t/${tourSlug}?view=1`;

  const snippet =
    size === "responsive"
      ? `<div style="position:relative;width:100%;padding-bottom:56.25%">
  <iframe
    src="${url}"
    style="position:absolute;inset:0;width:100%;height:100%;border:0"
    allow="fullscreen; gyroscope; accelerometer"
    loading="lazy"
    title="Virtual tour"
  ></iframe>
</div>`
      : (() => {
          const [w, h] = size.split("x");
          return `<iframe
  src="${url}"
  width="${w}"
  height="${h}"
  style="border:0"
  allow="fullscreen; gyroscope; accelerometer"
  loading="lazy"
  title="Virtual tour"
></iframe>`;
        })();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: select text in textarea (handled by user)
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white dark:bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Embed this tour</h3>
            <p className="text-xs text-neutral-500">Drop the snippet into Squarespace, WordPress, or any HTML page.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-m-2 rounded p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <div>
            <label className="text-xs font-medium text-neutral-500">Size</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSize(s.value)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    size === s.value
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                      : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-500">Embed code</label>
              <button
                type="button"
                onClick={copy}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                }`}
              >
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>
            <textarea
              readOnly
              value={snippet}
              rows={size === "responsive" ? 9 : 8}
              onClick={(e) => e.currentTarget.select()}
              className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 font-mono text-xs outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div className="rounded-md bg-neutral-100 dark:bg-neutral-900 p-3 text-xs text-neutral-600 dark:text-neutral-400">
            <strong className="text-neutral-900 dark:text-neutral-100">Or just send a link:</strong>
            <div className="mt-1 flex items-center gap-2">
              <input
                readOnly
                value={directUrl}
                onClick={(e) => e.currentTarget.select()}
                className="flex-1 truncate rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(directUrl);
                }}
                className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs font-medium hover:bg-white dark:hover:bg-neutral-800"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
            <strong>Heads up:</strong> in this prototype the tour is served from
            <span className="font-mono"> {origin || "this localhost"}</span>. Once you put the
            tour on a public domain (M3+), the same snippet works on any site.
          </div>
        </div>
      </div>
    </div>
  );
}
