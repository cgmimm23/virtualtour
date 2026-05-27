"use client";

import { useMemo, useRef, useState } from "react";
import type { Scene } from "@/lib/tour/types";

interface ScenePickerProps {
  scenes: Scene[];
  currentSceneId: string;
  coverSceneId: string;
  onSelect: (sceneId: string) => void;
  onRename?: (sceneId: string, name: string) => void;
  onSetCover?: (sceneId: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  onDelete?: (sceneId: string) => void;
  editMode: boolean;
}

/** "Unassigned" pseudo-floor label for scenes that haven't been tagged yet. */
const UNASSIGNED = "Unassigned";

export function ScenePicker({
  scenes,
  currentSceneId,
  coverSceneId,
  onSelect,
  onRename,
  onSetCover,
  onReorder,
  onDelete,
  editMode,
}: ScenePickerProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const dragStartIndex = useRef<number | null>(null);

  const onDragStart = (id: string, index: number) => (e: React.DragEvent) => {
    setDraggingId(id);
    dragStartIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (id !== overId) setOverId(id);
  };
  const onDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId || !onReorder) {
      setDraggingId(null);
      setOverId(null);
      return;
    }
    const ids = scenes.map((s) => s.id);
    const fromIdx = ids.indexOf(draggingId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggingId);
    onReorder(next);
    setDraggingId(null);
    setOverId(null);
  };
  const onDragEnd = () => {
    setDraggingId(null);
    setOverId(null);
  };

  const toggleGroup = (floor: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(floor)) next.delete(floor);
      else next.add(floor);
      return next;
    });

  // Group scenes by floor while preserving the underlying array order. If no
  // scene has a floor tag yet, render flat (no headers) — clean default.
  const groups = useMemo(() => {
    const hasAny = scenes.some((s) => !!s.floor);
    if (!hasAny) return null;
    const map = new Map<string, { floor: string; scenes: Array<{ scene: Scene; index: number }> }>();
    scenes.forEach((s, i) => {
      const floor = s.floor || UNASSIGNED;
      if (!map.has(floor)) map.set(floor, { floor, scenes: [] });
      map.get(floor)!.scenes.push({ scene: s, index: i });
    });
    return Array.from(map.values());
  }, [scenes]);

  const renderRow = (s: Scene, idx: number) => {
    const isCurrent = s.id === currentSceneId;
    const isCover = s.id === coverSceneId;
    const isDragging = s.id === draggingId;
    const isOver = s.id === overId && draggingId && draggingId !== s.id;
    return (
      <li
        key={s.id}
        draggable={editMode && !!onReorder}
        onDragStart={onDragStart(s.id, idx)}
        onDragOver={onDragOver(s.id)}
        onDrop={onDrop(s.id)}
        onDragEnd={onDragEnd}
        className={`relative ${isOver ? "before:absolute before:inset-x-0 before:-top-0.5 before:h-0.5 before:bg-amber-400" : ""} ${isDragging ? "opacity-40" : ""}`}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect(s.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSelect(s.id);
          }}
          className={`flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors ${
            isCurrent
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
          } ${editMode && onReorder ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
        >
          <img
            src={s.imageUrl}
            alt=""
            width={64}
            height={32}
            className="h-8 w-16 flex-shrink-0 rounded object-cover"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            {editMode && onRename ? (
              <input
                value={s.name}
                onChange={(e) => onRename(s.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                draggable={false}
                className="w-full truncate bg-transparent text-sm font-medium outline-none"
              />
            ) : (
              <div className="truncate text-sm font-medium">{s.name}</div>
            )}
            <div className={`text-xs ${isCurrent ? "opacity-70" : "text-neutral-500"}`}>
              {s.hotspots.length} hotspot{s.hotspots.length === 1 ? "" : "s"}
            </div>
          </div>
          {editMode && onSetCover ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetCover(s.id);
              }}
              className={`flex-shrink-0 rounded p-1 transition-colors ${
                isCover
                  ? "text-amber-400"
                  : isCurrent
                    ? "text-white/40 hover:text-white"
                    : "text-neutral-400 hover:text-amber-500"
              }`}
              aria-label={isCover ? "Cover scene" : "Set as cover scene"}
              title={isCover ? "Cover scene (opens first)" : "Set as cover scene"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isCover ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ) : null}
          {editMode && onDelete ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.id);
              }}
              className={`flex-shrink-0 rounded p-1 transition-colors ${
                isCurrent
                  ? "text-white/40 hover:text-red-300"
                  : "text-neutral-400 hover:text-red-600"
              }`}
              aria-label="Delete scene"
              title="Delete scene"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          ) : null}
          {!editMode && isCover ? (
            <span
              className={`flex-shrink-0 ${isCurrent ? "text-amber-300" : "text-amber-500"}`}
              title="Cover scene"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
          ) : null}
        </div>
      </li>
    );
  };

  if (!groups) {
    return (
      <ul className="flex flex-col gap-1 overflow-y-auto p-2">
        {scenes.map((s, idx) => renderRow(s, idx))}
      </ul>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {groups.map((g) => {
        const isCollapsed = collapsed.has(g.floor);
        return (
          <div key={g.floor} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
            <button
              type="button"
              onClick={() => toggleGroup(g.floor)}
              className="flex w-full items-center justify-between gap-2 bg-neutral-50/80 dark:bg-neutral-900/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <span className="flex items-center gap-2">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {g.floor}
              </span>
              <span className="text-neutral-400">{g.scenes.length}</span>
            </button>
            {!isCollapsed ? (
              <ul className="flex flex-col gap-1 p-2">
                {g.scenes.map(({ scene, index }) => renderRow(scene, index))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
