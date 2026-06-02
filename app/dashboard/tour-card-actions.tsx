"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTour } from "@/lib/tour/actions";

interface TourCardActionsProps {
  tourId: string;
  tourTitle: string;
}

export function TourCardActions({ tourId, tourTitle }: TourCardActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const onDelete = () => {
    setOpen(false);
    if (
      !window.confirm(
        `Delete "${tourTitle}"? All scenes, hotspots, leads, and analytics for this tour will be removed. Photos in R2 stay until purged. This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteTour(tourId);
        // deleteTour calls redirect("/dashboard") on success — control
        // usually doesn't return here. Refresh as a fallback.
        router.refresh();
      } catch (err) {
        window.alert(`Couldn't delete: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
        aria-label="Tour actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open ? (
        <>
          {/* click-away to dismiss */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <button
              type="button"
              onClick={onDelete}
              className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Delete tour
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
