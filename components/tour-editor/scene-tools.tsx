"use client";

import { useState, useTransition } from "react";
import type { Scene } from "@/lib/tour/types";

const RAD = Math.PI / 180;

type ViewField = "initialYaw" | "initialPitch" | "initialFov" | "initialRoll";

interface SceneToolsProps {
  scene: Scene;
  totalScenes: number;
  onUpdate: (next: Partial<Pick<Scene, ViewField | "floor">>) => void;
  onApplyToAll: (fields: ViewField[]) => void;
  onCaptureCurrent: () => void;
}

const SUGGESTED_FLOORS = ["Outside", "Ground", "Second", "Third", "Basement"];

/**
 * Floating panel for tweaking the opening view of the current scene.
 * - Roll fixes a tilted horizon (camera was crooked when shot)
 * - Yaw chooses which direction faces the viewer when the scene loads
 * - Pitch chooses look-up vs look-down
 * - FOV chooses zoom level
 *
 * "Use current view" snapshots whatever the user is looking at right now.
 * "Reset" zeroes everything (centered, level, 100° FOV).
 */
export function SceneTools({
  scene,
  totalScenes,
  onUpdate,
  onApplyToAll,
  onCaptureCurrent,
}: SceneToolsProps) {
  const yawDeg = (scene.initialYaw / RAD).toFixed(0);
  const pitchDeg = (scene.initialPitch / RAD).toFixed(0);
  const rollDeg = ((scene.initialRoll ?? 0) / RAD).toFixed(1);
  const fovDeg = (scene.initialFov / RAD).toFixed(0);

  const [autoLeveling, startAutoLevel] = useTransition();
  const [autoMessage, setAutoMessage] = useState<string | null>(null);

  const onAutoLevel = () => {
    setAutoMessage(null);
    startAutoLevel(async () => {
      try {
        const res = await fetch("/api/ai/auto-level", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sceneId: scene.id, imageUrl: scene.imageUrl }),
        });
        const json = await res.json();
        if (!json.ok) {
          setAutoMessage(`Couldn't auto-level: ${json.error ?? "unknown"}`);
          return;
        }
        onUpdate({ initialRoll: json.roll, initialPitch: json.pitch });
        const rollDegFmt = ((json.roll as number) * 180 / Math.PI).toFixed(1);
        const pitchDegFmt = ((json.pitch as number) * 180 / Math.PI).toFixed(1);
        setAutoMessage(
          `Set roll ${rollDegFmt}° / pitch ${pitchDegFmt}° (confidence ${Math.round(json.confidence * 100)}%).`,
        );
      } catch (err) {
        setAutoMessage(`Auto-level request failed: ${err instanceof Error ? err.message : "unknown"}`);
      }
    });
  };

  return (
    <div className="pointer-events-auto absolute left-3 top-3 w-64 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 p-3 shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Align scene
        </h3>
        <button
          type="button"
          onClick={() =>
            onUpdate({ initialYaw: 0, initialPitch: 0, initialRoll: 0, initialFov: (100 * Math.PI) / 180 })
          }
          className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          title="Reset to centered + level + 100° FOV"
        >
          Reset
        </button>
      </div>

      <div className="mb-3 rounded-md border border-brand-200 bg-brand-50/60 p-2 dark:border-brand-900/40 dark:bg-brand-950/30">
        <button
          type="button"
          onClick={onAutoLevel}
          disabled={autoLeveling}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {autoLeveling ? "Analyzing…" : "✨ Auto-level (AI)"}
        </button>
        <p className="mt-1.5 text-[10px] leading-snug text-neutral-600 dark:text-neutral-400">
          Sets the opening roll &amp; pitch using Claude vision. Panning may still show
          the original tilt — re-shoot with a leveled tripod for perfect horizons.
        </p>
        {autoMessage ? (
          <p className="mt-1.5 text-[10px] text-neutral-700 dark:text-neutral-300">
            {autoMessage}
          </p>
        ) : null}
      </div>

      <div className="mb-3">
        <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
          Floor
        </label>
        <div className="mt-1 flex flex-wrap gap-1">
          {SUGGESTED_FLOORS.map((f) => {
            const active = scene.floor === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onUpdate({ floor: active ? undefined : f })}
                className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={scene.floor ?? ""}
          onChange={(e) => onUpdate({ floor: e.target.value || undefined })}
          placeholder="Or type a custom floor name…"
          className="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-[11px] outline-none focus:border-neutral-900 dark:focus:border-white"
        />
      </div>

      <Slider
        label="Tilt (roll)"
        unit="°"
        value={Number(rollDeg)}
        min={-30}
        max={30}
        step={0.1}
        onChange={(v) => onUpdate({ initialRoll: v * RAD })}
      />
      <Slider
        label="Pan (yaw)"
        unit="°"
        value={Number(yawDeg)}
        min={-180}
        max={180}
        step={1}
        onChange={(v) => onUpdate({ initialYaw: v * RAD })}
      />
      <Slider
        label="Look (pitch)"
        unit="°"
        value={Number(pitchDeg)}
        min={-89}
        max={89}
        step={1}
        onChange={(v) => onUpdate({ initialPitch: v * RAD })}
      />
      <Slider
        label="Zoom (FOV)"
        unit="°"
        value={Number(fovDeg)}
        min={30}
        max={110}
        step={1}
        onChange={(v) => onUpdate({ initialFov: v * RAD })}
      />

      <button
        type="button"
        onClick={onCaptureCurrent}
        className="mt-2 w-full rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        title="Snapshot the panorama exactly as you've panned it as the opening shot"
      >
        Use current view as opening
      </button>

      <div className="mt-3 border-t border-neutral-200 dark:border-neutral-800 pt-3">
        <label className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          Apply to all {totalScenes} scenes
        </label>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onApplyToAll(["initialRoll"])}
            disabled={(scene.initialRoll ?? 0) === 0}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-[11px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            title={`Set every scene's tilt to ${(((scene.initialRoll ?? 0) * 180) / Math.PI).toFixed(1)}°`}
          >
            Tilt only
          </button>
          <button
            type="button"
            onClick={() => onApplyToAll(["initialFov"])}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-[11px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Set every scene's opening zoom to match this one"
          >
            Zoom only
          </button>
          <button
            type="button"
            onClick={() => onApplyToAll(["initialRoll", "initialPitch"])}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-[11px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Match tilt + look (pitch) on every scene — common for shots from the same tripod"
          >
            Tilt + look
          </button>
          <button
            type="button"
            onClick={() => onApplyToAll(["initialRoll", "initialPitch", "initialFov"])}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-[11px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Match tilt + look + zoom (everything except yaw, since each room faces differently)"
          >
            All but yaw
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-neutral-500">
          Yaw is per-scene — each room faces a different direction.
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-baseline justify-between">
        <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
          {label}
        </label>
        <span className="text-[11px] tabular-nums text-neutral-500">
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
