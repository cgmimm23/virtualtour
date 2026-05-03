"use client";

import { useState } from "react";
import type { BrandingConfig } from "@/lib/tour/types";

interface BrandingModalProps {
  branding: BrandingConfig;
  onSave: (next: BrandingConfig) => void;
  onClose: () => void;
}

export function BrandingModal({ branding, onSave, onClose }: BrandingModalProps) {
  const [draft, setDraft] = useState<BrandingConfig>(branding);

  const set = <K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onPhotoUpload = async (file: File) => {
    // localStorage-only: encode to data URL. Fine for personal use; M3 will
    // replace this with R2 signed uploads.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") set("agentPhotoUrl", reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white dark:bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
          <h3 className="text-base font-semibold">Branding</h3>
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
          <Field label="Agent name" value={draft.agentName ?? ""} onChange={(v) => set("agentName", v)} placeholder="Jane Smith" />
          <Field label="Brokerage" value={draft.brokerageName ?? ""} onChange={(v) => set("brokerageName", v)} placeholder="Acme Realty" />
          <Field label="Phone" value={draft.agentPhone ?? ""} onChange={(v) => set("agentPhone", v)} placeholder="+1 555 123 4567" />
          <Field label="Email" value={draft.agentEmail ?? ""} onChange={(v) => set("agentEmail", v)} placeholder="agent@brokerage.com" type="email" />
          <Field label="Primary color" value={draft.primaryColor ?? ""} onChange={(v) => set("primaryColor", v)} placeholder="#0ea5e9" />
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-neutral-500">Headshot</label>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                {draft.agentPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.agentPhotoUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <label className="cursor-pointer rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPhotoUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {draft.agentPhotoUrl ? (
                <button
                  type="button"
                  onClick={() => set("agentPhotoUrl", undefined)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <p className="text-xs text-neutral-500">
              Stored locally as base64 in this prototype. Replaced by R2 upload in M3.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800 px-5 py-4">
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
              onSave(draft);
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:focus:border-white"
      />
    </div>
  );
}
