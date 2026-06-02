"use client";

import { useState, useTransition } from "react";
import type { ListingDetails, Tour } from "@/lib/tour/types";
import { refreshExternalSource, removeExternalSource } from "@/lib/tour/external-source";

interface ListingDetailsModalProps {
  /** Pull initial values from the tour so we can also edit expiration + webhook in one place. */
  tour: Pick<Tour, "details" | "expiresAt" | "webhookUrl" | "mlsDescription" | "qAndA" | "externalSources">;
  /** Needed for the external-source refresh server actions (writes through to DB directly). */
  tourId: string;
  onSave: (patch: {
    details?: ListingDetails;
    expiresAt?: string;
    webhookUrl?: string;
    mlsDescription?: string;
    qAndA?: Array<{ q: string; a: string }>;
  }) => void;
  onClose: () => void;
}

export function ListingDetailsModal({ tour, tourId, onSave, onClose }: ListingDetailsModalProps) {
  const [details, setDetails] = useState<ListingDetails>(tour.details ?? {});
  const [expiresAt, setExpiresAt] = useState(tour.expiresAt ?? "");
  const [webhookUrl, setWebhookUrl] = useState(tour.webhookUrl ?? "");
  const [mlsDescription, setMlsDescription] = useState(tour.mlsDescription ?? "");
  const [qAndA, setQAndA] = useState<Array<{ q: string; a: string }>>(tour.qAndA ?? []);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
  const [busySource, setBusySource] = useState<string | null>(null);
  const [, startSourceTx] = useTransition();

  const set = <K extends keyof ListingDetails>(k: K, v: ListingDetails[K]) =>
    setDetails((d) => ({ ...d, [k]: v }));

  const setNumber = (k: keyof ListingDetails) => (raw: string) => {
    if (raw.trim() === "") {
      setDetails((d) => {
        const next = { ...d };
        delete next[k];
        return next;
      });
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    set(k, n as never);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-semibold">Listing details & settings</h3>
            <p className="text-xs text-neutral-500">
              Shows on the viewer, emitted as structured data, and used for the social-share preview.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-m-2 rounded p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-neutral-500">Status</label>
            <div className="flex flex-wrap gap-1">
              {(["for_sale", "for_rent", "pending", "sold", "off_market"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("status", details.status === s ? undefined : s)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    details.status === s
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                      : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <NumField label="List price ($)" value={details.listPrice} onChange={setNumber("listPrice")} placeholder="650000" />
          <NumField label="MLS #" value={details.mlsNumber as number | undefined} onChange={(v) => set("mlsNumber", v as unknown as string)} placeholder="123456789" />
          <NumField label="Beds" value={details.beds} onChange={setNumber("beds")} placeholder="3" />
          <NumField label="Baths" value={details.baths} onChange={setNumber("baths")} placeholder="2.5" step="0.5" />
          <NumField label="Sqft" value={details.sqft} onChange={setNumber("sqft")} placeholder="1850" />
          <NumField label="Lot sqft" value={details.lotSqft} onChange={setNumber("lotSqft")} placeholder="6500" />
          <NumField label="Year built" value={details.yearBuilt} onChange={setNumber("yearBuilt")} placeholder="1998" />
          <Field label="Property type" value={details.propertyType ?? ""} onChange={(v) => set("propertyType", v || undefined)} placeholder="Single family residence" />

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-neutral-500">Tour expiration date (optional)</label>
            <input
              type="date"
              value={expiresAt ? expiresAt.slice(0, 10) : ""}
              onChange={(e) => setExpiresAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
              className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-white"
            />
            <p className="text-xs text-neutral-500">
              After this date the public viewer shows an "expired" message. Leave blank for no expiration.
            </p>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-neutral-500">Lead webhook URL (optional)</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/…"
              className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-white"
            />
            <p className="text-xs text-neutral-500">
              POSTed (no-cors, fire-and-forget) when a lead is captured. Body is the lead JSON plus a computed score.
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 sm:col-span-2 dark:border-neutral-800">
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                AI assistant — feeds the buyer chatbot
              </label>
              <span className="text-[10px] text-neutral-500">
                Everything in this section is sent to Claude as context.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-neutral-500">
              MLS / long-form description (optional)
            </label>
            <textarea
              value={mlsDescription}
              onChange={(e) => setMlsDescription(e.target.value)}
              placeholder="Paste the MLS description here. The bot uses this verbatim for questions about features, condition, recent updates, etc."
              rows={5}
              className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-white"
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-medium text-neutral-500">
                Q&amp;A — authoritative answers
              </label>
              <button
                type="button"
                onClick={() => setQAndA((prev) => [...prev, { q: "", a: "" }])}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                + Add Q&amp;A
              </button>
            </div>
            {qAndA.length === 0 ? (
              <p className="text-xs text-neutral-500">
                Example: <em>HOA fees?</em> → <em>$250/month, covers landscaping &amp; trash.</em> The
                bot uses these verbatim.
              </p>
            ) : null}
            {qAndA.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-md border border-neutral-200 p-2 sm:grid-cols-[1fr_2fr_auto] dark:border-neutral-800"
              >
                <input
                  type="text"
                  value={row.q}
                  onChange={(e) =>
                    setQAndA((prev) => prev.map((r, idx) => (idx === i ? { ...r, q: e.target.value } : r)))
                  }
                  placeholder="Question"
                  className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-white"
                />
                <input
                  type="text"
                  value={row.a}
                  onChange={(e) =>
                    setQAndA((prev) => prev.map((r, idx) => (idx === i ? { ...r, a: e.target.value } : r)))
                  }
                  placeholder="Answer"
                  className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => setQAndA((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-medium text-neutral-500">
              External listing sources (rentinsa.com, brokerage page, etc.)
            </label>
            <p className="text-xs text-neutral-500">
              We fetch the page server-side once and cache the readable text. The bot
              cross-references it when answering buyer questions. Max 3 URLs.
            </p>
            {(tour.externalSources ?? []).map((src) => (
              <div
                key={src.url}
                className="grid grid-cols-1 gap-2 rounded-md border border-neutral-200 p-2 sm:grid-cols-[1fr_auto_auto] dark:border-neutral-800"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{src.url}</div>
                  <div className="text-[10px] text-neutral-500">
                    {src.content.length.toLocaleString()} chars · refreshed{" "}
                    {new Date(src.fetchedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busySource === src.url}
                  onClick={() => {
                    setBusySource(src.url);
                    setSourceMessage(null);
                    startSourceTx(async () => {
                      const r = await refreshExternalSource({ tourId, url: src.url });
                      setBusySource(null);
                      setSourceMessage(
                        r.ok
                          ? `Refreshed ${src.url} — ${r.chars} chars.`
                          : `${src.url}: ${r.error}`,
                      );
                    });
                  }}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  {busySource === src.url ? "…" : "Refresh"}
                </button>
                <button
                  type="button"
                  disabled={busySource === src.url}
                  onClick={() => {
                    setBusySource(src.url);
                    setSourceMessage(null);
                    startSourceTx(async () => {
                      const r = await removeExternalSource({ tourId, url: src.url });
                      setBusySource(null);
                      setSourceMessage(r.ok ? `Removed ${src.url}.` : r.error);
                    });
                  }}
                  className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="url"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                placeholder="https://rentinsa.com/listing/…"
                className="flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-white"
              />
              <button
                type="button"
                disabled={!newSourceUrl.trim() || busySource === newSourceUrl}
                onClick={() => {
                  const url = newSourceUrl.trim();
                  if (!url) return;
                  setBusySource(url);
                  setSourceMessage(null);
                  startSourceTx(async () => {
                    const r = await refreshExternalSource({ tourId, url });
                    setBusySource(null);
                    if (r.ok) {
                      setNewSourceUrl("");
                      setSourceMessage(`Added ${url} — ${r.chars} chars cached.`);
                    } else {
                      setSourceMessage(r.error);
                    }
                  });
                }}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                {busySource === newSourceUrl ? "Fetching…" : "Add & fetch"}
              </button>
            </div>
            {sourceMessage ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">{sourceMessage}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({
                details: Object.keys(details).length ? details : undefined,
                expiresAt: expiresAt || undefined,
                webhookUrl: webhookUrl.trim() || undefined,
                mlsDescription: mlsDescription.trim() || undefined,
                qAndA: qAndA.filter((r) => r.q.trim() && r.a.trim()),
              });
              onClose();
            }}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-white"
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  placeholder,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-white"
      />
    </div>
  );
}
