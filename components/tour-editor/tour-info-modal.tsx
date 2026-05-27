"use client";

// Edit the tour title + property address. Opened from the tour-name button
// in the editor's top-left chrome.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateTourMeta } from "@/lib/tour/actions";

interface TourInfoModalProps {
  tourId: string;
  initialTitle: string;
  initialAddress: string;
  open: boolean;
  onClose: () => void;
}

export function TourInfoModal({
  tourId,
  initialTitle,
  initialAddress,
  open,
  onClose,
}: TourInfoModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [address, setAddress] = useState(initialAddress);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setAddress(initialAddress);
    setError(null);
  }, [open, initialTitle, initialAddress]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSave = useCallback(async () => {
    setPending(true);
    setError(null);
    const result = await updateTourMeta({ tourId, title, propertyAddress: address });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }, [tourId, title, address, router, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Tour info</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Tour title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-950"
            placeholder="123 Main Street"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Property address
          </span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={240}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-950"
            placeholder="123 Main St, Springfield, IL"
          />
        </label>

        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
