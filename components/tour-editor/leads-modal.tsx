"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/lib/tour/types";
import { leadScore, leadScoreLabel, leadsToCsv } from "@/lib/tour/leads";

interface LeadsModalProps {
  tourSlug: string;
  /**
   * Async loader for leads. When omitted (e.g. legacy single-tenant context),
   * the modal renders an empty state — leads now live in the database, so
   * the editor must wire this prop or there's nothing to show.
   */
  loadLeads?: () => Promise<Lead[]>;
  onClose: () => void;
}

export function LeadsModal({ tourSlug, loadLeads, onClose }: LeadsModalProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    loadLeads ? "loading" : "ready",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadLeads) return;
    let cancelled = false;
    setStatus("loading");
    loadLeads()
      .then((rows) => {
        if (cancelled) return;
        setLeads(rows);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load leads");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [loadLeads, tourSlug]);

  const handleExport = () => {
    const csv = leadsToCsv(leads);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tourSlug}-leads.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white dark:bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Leads</h3>
            <p className="text-xs text-neutral-500">
              {status === "loading"
                ? "Loading…"
                : `${leads.length} captured`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={leads.length === 0}
              className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              Download CSV
            </button>
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
        </div>
        <div className="flex-1 overflow-y-auto">
          {status === "error" ? (
            <div className="px-5 py-12 text-center text-sm text-red-600">
              {error}
            </div>
          ) : status === "loading" ? (
            <div className="px-5 py-12 text-center text-sm text-neutral-500">Loading leads…</div>
          ) : leads.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-neutral-500">
              No leads yet. Open the public tour link and submit the email gate to test.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-2 text-left font-medium">Score</th>
                  <th className="px-5 py-2 text-left font-medium">Captured</th>
                  <th className="px-5 py-2 text-left font-medium">Name</th>
                  <th className="px-5 py-2 text-left font-medium">Email</th>
                  <th className="px-5 py-2 text-left font-medium">Phone</th>
                  <th className="px-5 py-2 text-left font-medium">Source</th>
                  <th className="px-5 py-2 text-left font-medium">Activity</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const captured = new Date(l.capturedAt);
                  const minutes = Math.round(l.durationMs / 60000);
                  const score = leadScore(l);
                  const label = leadScoreLabel(score);
                  const labelClass =
                    label === "hot"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      : label === "warm"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
                  return (
                    <tr key={l.id} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${labelClass}`}>
                            {label}
                          </span>
                          <span className="text-xs tabular-nums text-neutral-500">{score}</span>
                        </div>
                      </td>
                      <td className="px-5 py-2 text-xs text-neutral-500">
                        {captured.toLocaleString()}
                      </td>
                      <td className="px-5 py-2">{l.name ?? "—"}</td>
                      <td className="px-5 py-2 truncate">
                        <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>
                      </td>
                      <td className="px-5 py-2">{l.phone ?? "—"}</td>
                      <td className="px-5 py-2 text-xs text-neutral-500">
                        {l.source.replace(/_/g, " ")}
                        {l.preferredTime ? (
                          <div className="text-[10px] text-neutral-400">
                            wants: {new Date(l.preferredTime).toLocaleString()}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-2 text-xs text-neutral-500">
                        {l.scenesViewed} scene{l.scenesViewed === 1 ? "" : "s"} · {minutes} min
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
