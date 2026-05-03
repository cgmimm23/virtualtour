"use client";

import { useMemo, useState } from "react";
import type { Scene } from "@/lib/tour/types";

interface HighlightsModalProps {
  scenes: Scene[];
  highlights: string[];
  onChange: (next: string[]) => void;
  onClose: () => void;
}

export function HighlightsModal({ scenes, highlights, onChange, onClose }: HighlightsModalProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sceneById = useMemo(() => new Map(scenes.map((s) => [s.id, s])), [scenes]);
  const inHighlights = highlights.map((id) => sceneById.get(id)).filter((s): s is Scene => !!s);
  const notInHighlights = scenes.filter((s) => !highlights.includes(s.id));

  const add = (id: string) => onChange([...highlights, id]);
  const remove = (id: string) => onChange(highlights.filter((h) => h !== id));

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (id !== overId) setOverId(id);
  };
  const onDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setOverId(null);
      return;
    }
    const fromIdx = highlights.indexOf(draggingId);
    const toIdx = highlights.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...highlights];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggingId);
    onChange(next);
    setDraggingId(null);
    setOverId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white dark:bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Highlights</h3>
            <p className="text-xs text-neutral-500">
              Pick a curated path. Buyers can press "Watch highlights" to auto-play just these scenes in order.
            </p>
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

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-2">
          <div className="flex flex-col overflow-hidden border-r border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <span>In highlights ({inHighlights.length})</span>
              {highlights.length > 0 ? (
                <button type="button" onClick={() => onChange([])} className="text-red-600 hover:underline normal-case">
                  Clear
                </button>
              ) : null}
            </div>
            <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
              {inHighlights.length === 0 ? (
                <li className="px-2 py-6 text-center text-sm text-neutral-500">
                  No scenes added yet. Pick from the list →
                </li>
              ) : (
                inHighlights.map((s, i) => {
                  const isOver = s.id === overId && draggingId && draggingId !== s.id;
                  const isDragging = s.id === draggingId;
                  return (
                    <li
                      key={s.id}
                      draggable
                      onDragStart={onDragStart(s.id)}
                      onDragOver={onDragOver(s.id)}
                      onDrop={onDrop(s.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverId(null);
                      }}
                      className={`relative flex items-center gap-2 rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-grab active:cursor-grabbing ${isOver ? "before:absolute before:inset-x-0 before:-top-0.5 before:h-0.5 before:bg-amber-400" : ""} ${isDragging ? "opacity-40" : ""}`}
                    >
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-neutral-900">
                        {i + 1}
                      </span>
                      <img src={s.imageUrl} alt="" className="h-8 w-12 flex-shrink-0 rounded object-cover" loading="lazy" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                      <button
                        type="button"
                        onClick={() => remove(s.id)}
                        className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        aria-label={`Remove ${s.name}`}
                        title="Remove from highlights"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </svg>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div className="flex flex-col overflow-hidden">
            <div className="border-b border-neutral-100 dark:border-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              All scenes ({notInHighlights.length} unused)
            </div>
            <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
              {scenes.map((s) => {
                const isIn = highlights.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => (isIn ? remove(s.id) : add(s.id))}
                      className={`flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors ${
                        isIn
                          ? "bg-amber-100 dark:bg-amber-950/30"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <img src={s.imageUrl} alt="" className="h-8 w-12 flex-shrink-0 rounded object-cover" loading="lazy" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${isIn ? "bg-amber-400 text-neutral-900" : "border border-neutral-300 dark:border-neutral-700"}`}>
                        {isIn ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
