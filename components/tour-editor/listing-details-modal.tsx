"use client";

import { useState } from "react";
import type { ListingDetails, Tour } from "@/lib/tour/types";

interface ListingDetailsModalProps {
  /** Pull initial values from the tour so we can also edit expiration + webhook in one place. */
  tour: Pick<Tour, "details" | "expiresAt" | "webhookUrl">;
  onSave: (patch: { details?: ListingDetails; expiresAt?: string; webhookUrl?: string }) => void;
  onClose: () => void;
}

export function ListingDetailsModal({ tour, onSave, onClose }: ListingDetailsModalProps) {
  const [details, setDetails] = useState<ListingDetails>(tour.details ?? {});
  const [expiresAt, setExpiresAt] = useState(tour.expiresAt ?? "");
  const [webhookUrl, setWebhookUrl] = useState(tour.webhookUrl ?? "");

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
