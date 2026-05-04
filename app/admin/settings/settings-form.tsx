"use client";

import { useState, useTransition } from "react";
import { saveSecret, deleteSecret } from "@/lib/stripe/billing-actions";

interface SettingsFormProps {
  secretKey: string;
  label: string;
  placeholder?: string;
  sensitive?: boolean;
  helperText?: string;
  fromEnv: boolean;
  fromDb: boolean;
}

export function SettingsForm({
  secretKey,
  label,
  placeholder,
  sensitive,
  helperText,
  fromEnv,
  fromDb,
}: SettingsFormProps) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const onSave = () => {
    if (!value.trim()) {
      setMessage("Value can't be empty");
      return;
    }
    startTransition(async () => {
      const r = await saveSecret({ key: secretKey, value });
      if (r.ok) {
        setMessage("Saved");
        setValue("");
      } else {
        setMessage(`Error: ${r.error}`);
      }
    });
  };

  const onDelete = () => {
    if (!confirm(`Remove the saved value for ${secretKey}? Env var fallback (if set) still applies.`)) return;
    startTransition(async () => {
      const r = await deleteSecret(secretKey);
      setMessage(r.ok ? "Removed" : `Error: ${r.error}`);
    });
  };

  return (
    <div className="border-t border-neutral-100 pt-3 first:border-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <label className="font-mono text-xs font-medium text-neutral-700">{secretKey}</label>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {fromEnv ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700">
              env
            </span>
          ) : null}
          {fromDb ? (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-700">
              db
            </span>
          ) : null}
          {!fromEnv && !fromDb ? (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              not set
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-1 text-sm text-neutral-600">{label}</div>
      {helperText ? (
        <p className="mt-1 text-xs text-neutral-500">{helperText}</p>
      ) : null}

      <div className="mt-2 flex gap-2">
        <input
          type={sensitive && !reveal ? "password" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? ""}
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-mono text-xs outline-none focus:border-brand-500"
        />
        {sensitive ? (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-100"
            title={reveal ? "Hide" : "Show"}
          >
            {reveal ? "🙈" : "👁"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !value}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {pending ? "…" : "Save"}
        </button>
        {fromDb ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
            title="Remove the DB-stored value (env var still wins if set)"
          >
            Remove
          </button>
        ) : null}
      </div>

      {message ? (
        <p
          className={`mt-1 text-xs ${
            message.startsWith("Error") ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
