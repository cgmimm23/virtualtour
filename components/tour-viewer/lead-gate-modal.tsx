"use client";

import { useState } from "react";
import type { BrandingConfig, LeadGateConfig } from "@/lib/tour/types";

interface LeadGateModalProps {
  config: LeadGateConfig;
  branding?: BrandingConfig;
  onSubmit: (data: { email: string; name?: string; phone?: string; preferredTime?: string }) => void;
  onSkip?: () => void;
}

export function LeadGateModal({ config, branding, onSubmit, onSkip }: LeadGateModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const accent = branding?.primaryColor ?? "#205081";
  const collectTime = config.mode === "schedule" || config.collectPreferredTime;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitted) return;
    setSubmitted(true);
    onSubmit({
      email: email.trim(),
      name: config.collectName && name.trim() ? name.trim() : undefined,
      phone: config.collectPhone && phone.trim() ? phone.trim() : undefined,
      preferredTime: collectTime && preferredTime ? preferredTime : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-neutral-950 sm:rounded-2xl sm:p-6"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0))" }}
      >
        {branding?.agentName ? (
          <div className="mb-4 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            {branding.agentPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.agentPhotoUrl} alt={branding.agentName} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: accent }}>
                {branding.agentName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{branding.agentName}</div>
              {branding.brokerageName ? (
                <div className="truncate text-xs text-neutral-500">{branding.brokerageName}</div>
              ) : null}
            </div>
          </div>
        ) : null}

        <h2 className="text-xl font-semibold">{config.headline}</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{config.subhead}</p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          {config.collectName ? (
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          ) : null}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus={!config.collectName}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:focus:border-white"
          />
          {config.collectPhone ? (
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          ) : null}
          {collectTime ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Preferred date & time</label>
              <input
                type="datetime-local"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:focus:border-white"
              />
            </div>
          ) : null}
          <button
            type="submit"
            disabled={submitted || !email.trim()}
            className="mt-1 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            style={{ background: accent }}
          >
            {config.ctaLabel}
          </button>
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Skip for now
            </button>
          ) : null}
        </form>

        {config.consentText ? (
          <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
            {config.consentText}
          </p>
        ) : null}

        <p className="mt-3 text-[10px] uppercase tracking-wider text-neutral-400">
          Powered by Tourly
        </p>
      </div>
    </div>
  );
}
