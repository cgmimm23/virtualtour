"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BrandingConfig,
  Hotspot,
  HotspotPayload,
  Lead,
  ListingDetails,
  Scene,
  Tour,
} from "@/lib/tour/types";
import { fireLeadWebhook, hasGateBeenPassed, markGatePassed } from "@/lib/tour/leads";
import { newId } from "@/lib/tour/id";
import { deleteScene as deleteSceneAction } from "@/lib/tour/upload-actions";
import { ScenePicker } from "./scene-picker";
import { HotspotPanel } from "./hotspot-panel";
import { InfoModal } from "./info-modal";
import { BrandingModal } from "./branding-modal";
import { LeadsModal } from "./leads-modal";
import { SceneTools } from "./scene-tools";
import { HighlightsModal } from "./highlights-modal";
import { EmbedModal } from "./embed-modal";
import { FloorPlanEditor } from "./floor-plan-editor";
import { HelpDrawer } from "./help-drawer";
import { ListingDetailsModal } from "./listing-details-modal";
import type { EditorContext } from "@/app/(marketing)/guide/_content/meta";
import { FloorPlanMini } from "@/components/tour-viewer/floor-plan-mini";
import { ImageModal } from "@/components/tour-viewer/image-modal";
import { VideoModal } from "@/components/tour-viewer/video-modal";
import { ListingDetailsOverlay } from "@/components/tour-viewer/listing-details-overlay";
import { HotspotMarker } from "@/components/tour-viewer/hotspot-marker";
import { AgentCard } from "@/components/tour-viewer/agent-card";
import { LeadGateModal } from "@/components/tour-viewer/lead-gate-modal";
import { SceneStrip } from "@/components/tour-viewer/scene-strip";
import { BuyerChat } from "@/components/tour-viewer/buyer-chat";
import { PlaybackControls, SideArrows } from "@/components/tour-viewer/playback-controls";

// Marzipano touches `window` on import. Disable SSR for the viewer.
const TourViewer = dynamic(
  () => import("@/components/tour-viewer/tour-viewer").then((m) => m.TourViewer),
  {
    ssr: false,
    loading: () => (
      <div className="tour-stage flex items-center justify-center text-white/60 text-sm">
        Loading viewer…
      </div>
    ),
  },
);

const HISTORY_LIMIT = 50;
const AUTO_PLAY_INTERVAL_MS = 6000;

export interface PublicLeadInput {
  email: string;
  name?: string;
  phone?: string;
  preferredTime?: string;
  source: Lead["source"];
  scenesViewed: number;
  durationMs: number;
}

interface TourExperienceProps {
  baseTour: Tour;
  /**
   * When true, the editor toolbar is rendered and edits are persisted via
   * `onSaveTour`. When false (the default), the component renders the
   * read-only public viewer. /t/[slug] passes canEdit=false; the dashboard
   * editor passes canEdit=true after the team-membership check.
   */
  canEdit?: boolean;
  /** Called (debounced) whenever the in-memory tour changes in edit mode. */
  onSaveTour?: (tour: Tour) => Promise<{ ok: boolean; error?: string }>;
  /** Submits a lead from the public viewer. Required for lead capture. */
  onSubmitLead?: (input: PublicLeadInput) => Promise<{ ok: boolean; error?: string }>;
  /** Loads leads for the agent-side LeadsModal. */
  onLoadLeads?: () => Promise<Lead[]>;
  /** Resets the in-memory tour to baseTour and persists. Optional. */
  onResetTour?: () => Promise<void> | void;
}

interface ClipboardHotspot {
  hotspot: Hotspot;
  fromSceneId: string;
}

const SAVE_DEBOUNCE_MS = 800;

export function TourExperience({
  baseTour,
  canEdit = false,
  onSaveTour,
  onSubmitLead,
  onLoadLeads,
  onResetTour,
}: TourExperienceProps) {
  const searchParams = useSearchParams();
  const isEmbedMode = searchParams.get("embed") === "1";
  const isKioskMode = searchParams.get("kiosk") === "1";
  const isPreviewMode = searchParams.get("preview") === "1";
  const isNoBrandMode = searchParams.get("nobrand") === "1";
  const isShareMode =
    !canEdit ||
    isEmbedMode ||
    isKioskMode ||
    isPreviewMode ||
    searchParams.get("view") === "1";

  const [tour, setTour] = useState<Tour>(baseTour);
  const [hydrated, setHydrated] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState<string>(baseTour.coverSceneId);
  const [editMode, setEditMode] = useState(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);
  // Sidebar defaults open for desktop. We close on mount when the viewport
  // is narrow so mobile users land on the viewer, not the scene list. We
  // initialize to `true` instead of feature-detecting in useState to avoid
  // a hydration mismatch.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [leadsOpen, setLeadsOpen] = useState(false);
  const [contactGateOpen, setContactGateOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gatePassed, setGatePassed] = useState(true); // assume passed until hydration says otherwise
  const [clipboardHotspot, setClipboardHotspot] = useState<ClipboardHotspot | null>(null);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [sceneToolsOpen, setSceneToolsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [applyViewVersion, setApplyViewVersion] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingHighlights, setIsPlayingHighlights] = useState(false);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [floorPlanOpen, setFloorPlanOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [listingDetailsOpen, setListingDetailsOpen] = useState(false);
  const [imageModal, setImageModal] = useState<{ url: string; caption?: string; beforeUrl?: string } | null>(null);
  const [videoModal, setVideoModal] = useState<{ url: string; caption?: string; autoplay?: boolean } | null>(null);

  // Undo/redo history. Stored in a ref so updating it doesn't re-render; we
  // expose only `historyIndex` via state for button-disabled affordances.
  const historyRef = useRef<Tour[]>([baseTour]);

  // Track session metrics for lead context.
  const sessionStartRef = useRef<number>(Date.now());
  const scenesViewedRef = useRef<Set<string>>(new Set());
  // Distinguishes whether the contact gate was triggered by the agent card vs. an in-scene contact hotspot.
  const contactSourceRef = useRef<"contact_button" | "in_scene_contact">("contact_button");

  // Save-status state. Declared up front so the reset effect below can poke
  // the lastSaveSerializedRef when the upstream tour swaps.
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  // Seed with baseTour so the first mount doesn't trigger a no-op save.
  const lastSaveSerializedRef = useRef<string>(JSON.stringify(baseTour));

  // Reset local state when the upstream tour changes (e.g. after server save
  // revalidates the page). Per-session state (lead-gate-passed, scene
  // tracking) still comes from sessionStorage on first mount.
  //
  // Preserve currentSceneId across baseTour changes as long as the scene
  // still exists. Without this guard, every auto-save → revalidate →
  // baseTour-prop-reidentity round-trip would yank the user back to the
  // cover scene mid-edit — even just nudging the view triggered it.
  useEffect(() => {
    setTour(baseTour);
    historyRef.current = [baseTour];
    setHistoryIndex(0);
    setCurrentSceneId((prev) =>
      prev && baseTour.scenes.some((s) => s.id === prev)
        ? prev
        : baseTour.coverSceneId || baseTour.scenes[0]?.id || "",
    );
    setHydrated(true);
    setGatePassed(hasGateBeenPassed(baseTour.slug));
    sessionStartRef.current = Date.now();
    scenesViewedRef.current = new Set([baseTour.coverSceneId]);
    // Re-seed the save guard so a server-pushed revalidate doesn't bounce
    // straight back as another save.
    lastSaveSerializedRef.current = JSON.stringify(baseTour);
  }, [baseTour]);

  useEffect(() => {
    if (!hydrated) return;
    if (!canEdit || !onSaveTour) return;

    const serialized = JSON.stringify(tour);
    if (serialized === lastSaveSerializedRef.current) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      setSaveStatus("saving");
      const result = await onSaveTour(tour);
      if (result.ok) {
        lastSaveSerializedRef.current = serialized;
        setSaveStatus("saved");
        setSaveError(null);
      } else {
        setSaveStatus("error");
        setSaveError(result.error ?? "Save failed");
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [tour, hydrated, canEdit, onSaveTour]);

  // Close the sidebar by default on narrow viewports — desktop users keep it
  // open. Runs once on mount; resize handlers would be over-engineering for
  // a panel users can manually toggle.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Scene-tracking for the lead gate trigger.
  useEffect(() => {
    if (!currentSceneId) return;
    scenesViewedRef.current.add(currentSceneId);
  }, [currentSceneId]);

  // Lead gate trigger: when gate is enabled, share/view mode is on, gate hasn't
  // been passed in this session, and either trigger condition has fired.
  // Suppressed in kiosk (open-house TV) and preview (seller draft) modes.
  useEffect(() => {
    if (!hydrated || editMode || gatePassed) return;
    if (isKioskMode || isPreviewMode) return;
    const gate = tour.leadGate;
    if (!gate?.enabled) return;
    const checkTriggers = () => {
      const elapsed = Date.now() - sessionStartRef.current;
      const seen = scenesViewedRef.current.size;
      if (seen >= gate.triggerScenes || elapsed >= gate.triggerMs) {
        setGateOpen(true);
      }
    };
    // Check immediately (in case scenes-viewed already qualifies) and on a timer.
    checkTriggers();
    const interval = window.setInterval(checkTriggers, 1000);
    return () => window.clearInterval(interval);
  }, [hydrated, editMode, gatePassed, tour.leadGate, currentSceneId, isKioskMode, isPreviewMode]);

  const currentScene = useMemo(
    () => tour.scenes.find((s) => s.id === currentSceneId) ?? tour.scenes[0],
    [tour, currentSceneId],
  );

  const selectedHotspot = useMemo(() => {
    if (!selectedHotspotId) return null;
    return currentScene.hotspots.find((h) => h.id === selectedHotspotId) ?? null;
  }, [currentScene, selectedHotspotId]);

  // Push a new tour state into the history stack and update.
  const commitTour = useCallback(
    (next: Tour | ((prev: Tour) => Tour)) => {
      setTour((prev) => {
        const resolved = typeof next === "function" ? (next as (p: Tour) => Tour)(prev) : next;
        if (resolved === prev) return prev;
        const truncated = historyRef.current.slice(0, historyIndex + 1);
        const newHistory = [...truncated, resolved];
        const trimmed =
          newHistory.length > HISTORY_LIMIT
            ? newHistory.slice(newHistory.length - HISTORY_LIMIT)
            : newHistory;
        historyRef.current = trimmed;
        setHistoryIndex(trimmed.length - 1);
        return resolved;
      });
    },
    [historyIndex],
  );

  const updateScene = useCallback(
    (sceneId: string, mutate: (scene: Scene) => Scene) => {
      commitTour((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) => (s.id === sceneId ? mutate(s) : s)),
      }));
    },
    [commitTour],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const next = historyRef.current[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);
    setTour(next);
    setSelectedHotspotId(null);
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const next = historyRef.current[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
    setTour(next);
    setSelectedHotspotId(null);
  }, [historyIndex]);

  const handlePlaceHotspot = useCallback(
    (yaw: number, pitch: number) => {
      const id = newId();
      const firstOther = tour.scenes.find((s) => s.id !== currentSceneId);
      const payload: HotspotPayload = {
        type: "scene_link",
        data: {
          targetSceneId: firstOther?.id ?? tour.scenes[0].id,
          transition: "fade",
          arrowRotation: 90,
        },
      };
      const newHotspot: Hotspot = { id, yaw, pitch, label: "", payload };
      updateScene(currentSceneId, (s) => ({ ...s, hotspots: [...s.hotspots, newHotspot] }));
      setSelectedHotspotId(id);
    },
    [tour.scenes, currentSceneId, updateScene],
  );

  const handleHotspotClick = useCallback(
    (hotspot: Hotspot) => {
      if (editMode) {
        setSelectedHotspotId(hotspot.id);
        return;
      }
      switch (hotspot.payload.type) {
        case "scene_link":
          setCurrentSceneId(hotspot.payload.data.targetSceneId);
          break;
        case "info":
          setInfoModal({
            title: hotspot.payload.data.title,
            body: hotspot.payload.data.bodyMarkdown,
          });
          break;
        case "url":
          window.open(hotspot.payload.data.url, "_blank", "noopener,noreferrer");
          break;
        case "image":
          setImageModal({
            url: hotspot.payload.data.url,
            caption: hotspot.payload.data.caption,
            beforeUrl: hotspot.payload.data.beforeUrl,
          });
          break;
        case "video":
          setVideoModal({
            url: hotspot.payload.data.url,
            caption: hotspot.payload.data.caption,
            autoplay: hotspot.payload.data.autoplay,
          });
          break;
        case "contact":
          contactSourceRef.current = "in_scene_contact";
          setContactGateOpen(true);
          break;
      }
    },
    [editMode],
  );

  const handleUpdateHotspot = useCallback(
    (next: Hotspot) => {
      updateScene(currentSceneId, (s) => ({
        ...s,
        hotspots: s.hotspots.map((h) => (h.id === next.id ? next : h)),
      }));
    },
    [currentSceneId, updateScene],
  );

  const handleDeleteHotspot = useCallback(
    (hotspotId: string) => {
      updateScene(currentSceneId, (s) => ({
        ...s,
        hotspots: s.hotspots.filter((h) => h.id !== hotspotId),
      }));
      setSelectedHotspotId(null);
    },
    [currentSceneId, updateScene],
  );

  const handleMoveHotspot = useCallback(
    (hotspotId: string, yaw: number, pitch: number) => {
      updateScene(currentSceneId, (s) => ({
        ...s,
        hotspots: s.hotspots.map((h) => (h.id === hotspotId ? { ...h, yaw, pitch } : h)),
      }));
    },
    [currentSceneId, updateScene],
  );

  const handleSceneViewSettled = useCallback(
    (sceneId: string, view: { yaw: number; pitch: number; fov: number; roll: number }) => {
      if (!editMode) return;
      updateScene(sceneId, (s) => ({
        ...s,
        initialYaw: view.yaw,
        initialPitch: view.pitch,
        initialFov: view.fov,
        initialRoll: view.roll,
      }));
    },
    [editMode, updateScene],
  );

  const handleSceneToolsUpdate = useCallback(
    (patch: Partial<Scene>) => {
      updateScene(currentSceneId, (s) => ({ ...s, ...patch }));
      // Live-apply the new initial-view params to the running viewer.
      setApplyViewVersion((v) => v + 1);
    },
    [currentSceneId, updateScene],
  );

  const handleSceneToolsCaptureCurrent = useCallback(() => {
    // The viewer's onSceneViewSettled already commits on every pointerup, so
    // bumping the version simply syncs whatever the user has on screen now.
    setApplyViewVersion((v) => v + 1);
  }, []);

  // AI auto-name: Claude vision labels each scene by looking at the panorama.
  // Skips scenes the user has already manually renamed (anything not "Scene NN").
  const [aiNamingState, setAiNamingState] = useState<{
    running: boolean;
    done: number;
    total: number;
    error: string | null;
  }>({ running: false, done: 0, total: 0, error: null });

  const handleAiAutoName = useCallback(async () => {
    const defaultPattern = /^Scene \d{2}$/;
    const targets = tour.scenes.filter((s) => defaultPattern.test(s.name));
    if (targets.length === 0) {
      alert(
        "Every scene already has a custom name. Reset to defaults first if you want AI to re-name them.",
      );
      return;
    }
    if (
      !confirm(
        `Use AI to name ${targets.length} scene${targets.length === 1 ? "" : "s"}? Sends each panorama to Claude vision; existing custom names are kept. Cost: roughly $${(targets.length * 0.05).toFixed(2)}.`,
      )
    ) {
      return;
    }

    setAiNamingState({ running: true, done: 0, total: targets.length, error: null });

    for (let i = 0; i < targets.length; i++) {
      const scene = targets[i];
      try {
        const res = await fetch("/api/auto-name-scene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: scene.imageUrl }),
        });
        const data = (await res.json()) as { name?: string; error?: string };
        if (!res.ok || !data.name) {
          throw new Error(data.error ?? `request failed (${res.status})`);
        }
        updateScene(scene.id, (s) =>
          // Only commit if the user hasn't manually changed it during the run.
          defaultPattern.test(s.name) ? { ...s, name: data.name! } : s,
        );
        setAiNamingState((p) => ({ ...p, done: i + 1 }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        setAiNamingState({ running: false, done: i, total: targets.length, error: msg });
        alert(
          `AI naming failed at scene ${i + 1} of ${targets.length}: ${msg}\n\nIf this is the first run on production, make sure ANTHROPIC_API_KEY is set in your Digital Ocean app's environment variables, then redeploy.`,
        );
        return;
      }
    }
    setAiNamingState({ running: false, done: targets.length, total: targets.length, error: null });
  }, [tour.scenes, updateScene]);

  const handleAutoDoorways = useCallback(
    (mode: "next-only" | "next-and-prev") => {
      if (tour.scenes.length < 2) return;
      const summary =
        mode === "next-and-prev"
          ? "Add a 'next' AND 'previous' doorway hotspot to every scene"
          : "Add a 'next' doorway hotspot to every scene";
      if (
        !confirm(
          `${summary} based on the current sidebar order? Existing hotspots are kept.`,
        )
      ) {
        return;
      }
      commitTour((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s, i) => {
          const next = prev.scenes[i + 1];
          const previous = prev.scenes[i - 1];
          const newHotspots: Hotspot[] = [];
          if (next) {
            newHotspots.push({
              id: newId(),
              yaw: s.initialYaw,
              pitch: -0.35, // ~20° below horizon — looks like a floor doorway
              label: next.name,
              payload: {
                type: "scene_link",
                data: { targetSceneId: next.id, transition: "fade", arrowRotation: 90 },
              },
            });
          }
          if (mode === "next-and-prev" && previous) {
            newHotspots.push({
              id: newId(),
              yaw: s.initialYaw + Math.PI, // opposite direction
              pitch: -0.35,
              label: previous.name,
              payload: {
                type: "scene_link",
                data: { targetSceneId: previous.id, transition: "fade", arrowRotation: 90 },
              },
            });
          }
          return { ...s, hotspots: [...s.hotspots, ...newHotspots] };
        }),
      }));
    },
    [tour.scenes.length, commitTour],
  );

  const handleApplyToAllScenes = useCallback(
    (fields: Array<"initialYaw" | "initialPitch" | "initialFov" | "initialRoll">) => {
      const source = tour.scenes.find((s) => s.id === currentSceneId);
      if (!source) return;
      const patch: Partial<Scene> = {};
      for (const f of fields) {
        // Default initialRoll to 0 when source hasn't set it explicitly.
        patch[f] = source[f] ?? (f === "initialRoll" ? 0 : 0);
      }
      const summary = fields
        .map((f) => f.replace("initial", "").toLowerCase())
        .join(" + ");
      if (
        !confirm(
          `Apply ${summary} from "${source.name}" to all ${tour.scenes.length} scenes? This overwrites those values.`,
        )
      ) {
        return;
      }
      commitTour((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) => ({ ...s, ...patch })),
      }));
      setApplyViewVersion((v) => v + 1);
    },
    [tour.scenes, currentSceneId, commitTour],
  );

  const handleRenameScene = useCallback(
    (sceneId: string, name: string) => {
      updateScene(sceneId, (s) => ({ ...s, name }));
    },
    [updateScene],
  );

  const handleSelectScene = useCallback((sceneId: string) => {
    setCurrentSceneId(sceneId);
    setSelectedHotspotId(null);
  }, []);

  // Linear navigation across the (reorderable) scenes array.
  const currentSceneIndex = useMemo(
    () => tour.scenes.findIndex((s) => s.id === currentSceneId),
    [tour.scenes, currentSceneId],
  );

  const goToPrev = useCallback(() => {
    if (currentSceneIndex <= 0) return;
    handleSelectScene(tour.scenes[currentSceneIndex - 1].id);
  }, [currentSceneIndex, tour.scenes, handleSelectScene]);

  const goToNext = useCallback(() => {
    if (currentSceneIndex < 0 || currentSceneIndex >= tour.scenes.length - 1) return;
    handleSelectScene(tour.scenes[currentSceneIndex + 1].id);
  }, [currentSceneIndex, tour.scenes, handleSelectScene]);

  const goToNextLooped = useCallback(() => {
    if (currentSceneIndex < 0) return;
    const next = (currentSceneIndex + 1) % tour.scenes.length;
    handleSelectScene(tour.scenes[next].id);
  }, [currentSceneIndex, tour.scenes, handleSelectScene]);

  const goToNextHighlight = useCallback(() => {
    const list = tour.highlights ?? [];
    if (list.length === 0) return;
    const idxInHighlights = list.indexOf(currentSceneId);
    const next = list[(idxInHighlights + 1) % list.length];
    handleSelectScene(next);
  }, [tour.highlights, currentSceneId, handleSelectScene]);

  const handleTogglePlay = useCallback(() => {
    // No-op while editing — the play button is hidden in edit mode but the
    // keyboard shortcut + any external trigger still need to be inert.
    if (editMode) return;
    setIsPlaying((p) => !p);
    setIsPlayingHighlights(false);
  }, [editMode]);

  const handleStartHighlights = useCallback(() => {
    if (editMode) return;
    const list = tour.highlights ?? [];
    if (list.length === 0) return;
    handleSelectScene(list[0]);
    setIsPlayingHighlights(true);
    setIsPlaying(true);
  }, [editMode, tour.highlights, handleSelectScene]);

  // Auto-advance: when playing, advance to next scene every N ms. Resets the
  // timer on each scene change so the user gets a full N ms in each room.
  // Hard-gated on !editMode so an in-flight timer can't tick while the user
  // is placing hotspots — they have to hit Preview / Share view to see
  // playback.
  useEffect(() => {
    if (!isPlaying || editMode || tour.scenes.length < 2) return;
    const advance = isPlayingHighlights ? goToNextHighlight : goToNextLooped;
    const id = window.setTimeout(advance, AUTO_PLAY_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [
    isPlaying,
    editMode,
    isPlayingHighlights,
    currentSceneId,
    goToNextLooped,
    goToNextHighlight,
    tour.scenes.length,
  ]);

  // Keyboard navigation: ←/→ for prev/next, Space to toggle play. Disabled
  // while typing in inputs. Disabled in edit mode (collides with hotspot ops).
  useEffect(() => {
    if (editMode) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === " ") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === "Escape" && isPlaying) {
        e.preventDefault();
        setIsPlaying(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, goToPrev, goToNext, handleTogglePlay, isPlaying]);

  // Stop auto-play whenever edit mode is on. Unconditional kill (not gated
  // on the current isPlaying value) so any path that flips isPlaying back
  // on — direct state writes, batched updates, leftover effects — gets
  // immediately reversed. The play UI is hidden in edit mode anyway, so
  // we never need a "playing" state alongside editing.
  useEffect(() => {
    if (editMode) {
      setIsPlaying(false);
      setIsPlayingHighlights(false);
    }
  }, [editMode]);

  // Belt-and-suspenders: also reset on every render that has editMode true
  // AND a stale truthy playback state. This catches the (theoretical) case
  // where a state setter slipped past the useEffect kill — most likely cause
  // is a hot-reloaded module with stale closures during dev.
  if (editMode && (isPlaying || isPlayingHighlights)) {
    // Schedule for the next tick — we can't setState during render.
    queueMicrotask(() => {
      setIsPlaying(false);
      setIsPlayingHighlights(false);
    });
  }

  const handleSetHighlights = useCallback(
    (next: string[]) => {
      commitTour((prev) => ({ ...prev, highlights: next }));
    },
    [commitTour],
  );

  const handleSetFloorPlanImage = useCallback(
    (imageUrl: string | undefined) => {
      commitTour((prev) => ({
        ...prev,
        floorPlan: imageUrl ? { imageUrl } : undefined,
      }));
    },
    [commitTour],
  );

  const handleSetFloorPlanPosition = useCallback(
    (sceneId: string, position: { x: number; y: number } | undefined) => {
      updateScene(sceneId, (s) => ({ ...s, floorPlanPosition: position }));
    },
    [updateScene],
  );

  const hasHighlights = (tour.highlights?.length ?? 0) > 0;

  const hasPrev = currentSceneIndex > 0;
  const hasNext = currentSceneIndex >= 0 && currentSceneIndex < tour.scenes.length - 1;

  const handleSetCover = useCallback(
    (sceneId: string) => {
      commitTour((prev) => ({ ...prev, coverSceneId: sceneId }));
    },
    [commitTour],
  );

  const handleReorderScenes = useCallback(
    (orderedIds: string[]) => {
      commitTour((prev) => {
        const byId = new Map(prev.scenes.map((s) => [s.id, s]));
        const next = orderedIds.map((id) => byId.get(id)!).filter(Boolean);
        // Append any scenes not in the ordered list (paranoid guard).
        for (const s of prev.scenes) {
          if (!orderedIds.includes(s.id)) next.push(s);
        }
        return { ...prev, scenes: next };
      });
    },
    [commitTour],
  );

  const handleDeleteScene = useCallback(
    async (sceneId: string) => {
      const scene = tour.scenes.find((s) => s.id === sceneId);
      const label = scene?.name ? `"${scene.name}"` : "this scene";
      if (!window.confirm(`Delete ${label}? This removes the photo and its hotspots permanently.`)) {
        return;
      }
      // 1) Yank the scene from local state FIRST so the debounced save can't
      //    upsert it back before the server-side delete lands.
      commitTour((prev) => {
        const nextScenes = prev.scenes.filter((s) => s.id !== sceneId);
        const next: Tour = { ...prev, scenes: nextScenes };
        if (prev.coverSceneId === sceneId) {
          next.coverSceneId = nextScenes[0]?.id ?? "";
        }
        if (prev.highlights?.includes(sceneId)) {
          next.highlights = prev.highlights.filter((id) => id !== sceneId);
        }
        return next;
      });
      // 2) If the active scene was the one we just deleted, jump to another.
      if (currentSceneId === sceneId) {
        const fallback = tour.scenes.find((s) => s.id !== sceneId);
        setCurrentSceneId(fallback?.id ?? "");
        setSelectedHotspotId(null);
      }
      // 3) Server-side delete: row + R2 objects.
      const result = await deleteSceneAction({ tourId: tour.id, sceneId });
      if (!result.ok) {
        // Save attempts will reconcile state via the next debounced save —
        // but tell the user something went wrong so they can retry.
        window.alert(`Couldn't fully delete the scene: ${result.error}`);
      }
    },
    [commitTour, currentSceneId, tour.scenes, tour.id],
  );

  const handleSaveBranding = useCallback(
    (next: BrandingConfig) => {
      commitTour((prev) => ({ ...prev, branding: next }));
    },
    [commitTour],
  );

  const handleCopyHotspot = useCallback(() => {
    if (!selectedHotspot) return;
    setClipboardHotspot({ hotspot: selectedHotspot, fromSceneId: currentSceneId });
  }, [selectedHotspot, currentSceneId]);

  const handlePasteHotspot = useCallback(
    (toAllScenes = false) => {
      if (!clipboardHotspot) return;
      const makePasted = () => ({
        ...clipboardHotspot.hotspot,
        id: newId(),
      });
      commitTour((prev) => {
        if (toAllScenes) {
          return {
            ...prev,
            scenes: prev.scenes.map((s) => ({
              ...s,
              hotspots: [...s.hotspots, makePasted()],
            })),
          };
        }
        return {
          ...prev,
          scenes: prev.scenes.map((s) =>
            s.id === currentSceneId ? { ...s, hotspots: [...s.hotspots, makePasted()] } : s,
          ),
        };
      });
    },
    [clipboardHotspot, currentSceneId, commitTour],
  );

  // Keyboard shortcuts: Delete/Backspace removes selected, Cmd/Ctrl+Z undo,
  // Cmd/Ctrl+Shift+Z redo, Cmd/Ctrl+C copy, Cmd/Ctrl+V paste.
  useEffect(() => {
    if (!editMode) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (meta && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (!inField && (e.key === "Delete" || e.key === "Backspace") && selectedHotspotId) {
        e.preventDefault();
        handleDeleteHotspot(selectedHotspotId);
        return;
      }
      if (!inField && meta && e.key.toLowerCase() === "c" && selectedHotspot) {
        e.preventDefault();
        handleCopyHotspot();
        return;
      }
      if (!inField && meta && e.key.toLowerCase() === "v" && clipboardHotspot) {
        e.preventDefault();
        handlePasteHotspot(e.shiftKey);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    editMode,
    selectedHotspotId,
    selectedHotspot,
    clipboardHotspot,
    handleDeleteHotspot,
    handleUndo,
    handleRedo,
    handleCopyHotspot,
    handlePasteHotspot,
  ]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(tour, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tour.slug}-tour.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tour]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Tour;
        if (!parsed?.scenes || !Array.isArray(parsed.scenes)) {
          alert("That file doesn't look like a tour export.");
          return;
        }
        commitTour(parsed);
        setCurrentSceneId(parsed.coverSceneId ?? parsed.scenes[0]?.id);
      } catch {
        alert("Couldn't parse that file as JSON.");
      }
    },
    [commitTour],
  );

  const handleReset = useCallback(async () => {
    if (
      !confirm(
        "Discard all hotspots, branding, and renames for this tour? This can't be undone.",
      )
    )
      return;
    if (onResetTour) {
      await onResetTour();
    }
    commitTour(baseTour);
    setCurrentSceneId(baseTour.coverSceneId);
    setSelectedHotspotId(null);
  }, [baseTour, commitTour, onResetTour]);

  const handleGateSubmit = useCallback(
    (data: { email: string; name?: string; phone?: string; preferredTime?: string }) => {
      const source: Lead["source"] =
        tour.leadGate?.mode === "schedule" ? "schedule" : "gate";
      const scenesViewed = scenesViewedRef.current.size;
      const durationMs = Date.now() - sessionStartRef.current;
      // Local "happy path" UX — close the gate immediately. Network errors
      // surface in the LeadGateModal toast on next open if the submission
      // failed; webhook fire-and-forget continues regardless.
      void onSubmitLead?.({
        email: data.email,
        name: data.name,
        phone: data.phone,
        preferredTime: data.preferredTime,
        source,
        scenesViewed,
        durationMs,
      });
      fireLeadWebhook(tour.webhookUrl, {
        id: newId(),
        tourSlug: tour.slug,
        email: data.email,
        name: data.name,
        phone: data.phone,
        preferredTime: data.preferredTime,
        source,
        capturedAt: new Date().toISOString(),
        scenesViewed,
        durationMs,
      });
      markGatePassed(tour.slug);
      setGatePassed(true);
      setGateOpen(false);
      setContactGateOpen(false);
    },
    [tour.slug, tour.leadGate?.mode, tour.webhookUrl, onSubmitLead],
  );

  const handleContactClick = useCallback(() => {
    contactSourceRef.current = "contact_button";
    setContactGateOpen(true);
  }, []);

  const handleSaveListingDetails = useCallback(
    (patch: { details?: ListingDetails; expiresAt?: string; webhookUrl?: string }) => {
      commitTour((prev) => ({
        ...prev,
        details: patch.details,
        expiresAt: patch.expiresAt,
        webhookUrl: patch.webhookUrl,
      }));
    },
    [commitTour],
  );

  const totalHotspots = tour.scenes.reduce((n, s) => n + s.hotspots.length, 0);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyRef.current.length - 1;
  const isExpired = !!tour.expiresAt && new Date(tour.expiresAt).getTime() < Date.now();
  const showAgentCard = !isNoBrandMode && !isKioskMode && tour.branding;
  const showListingDetails = !!tour.details;

  // Auto-start autoplay when in kiosk mode (open-house TV).
  useEffect(() => {
    if (!hydrated || !isKioskMode) return;
    setIsPlaying(true);
  }, [hydrated, isKioskMode]);

  // Preview mode: tell crawlers not to index the seller-draft URL.
  useEffect(() => {
    if (!isPreviewMode) return;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, [isPreviewMode]);

  // SHARE MODE: minimal chrome, agent card + bottom strip + lead gate.
  if (isShareMode) {
    if (isExpired) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-neutral-950 p-6 text-center text-white">
          <div className="max-w-md">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold">This tour has expired</h1>
            <p className="mt-2 text-sm text-white/60">
              The listing at {tour.propertyAddress || tour.title} is no longer being shown.
              {tour.branding?.agentName ? ` Contact ${tour.branding.agentName} for current listings.` : ""}
            </p>
            {tour.branding?.agentEmail ? (
              <a
                href={`mailto:${tour.branding.agentEmail}`}
                className="mt-6 inline-block rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-200"
              >
                Email {tour.branding.agentName ?? "the agent"}
              </a>
            ) : null}
          </div>
        </div>
      );
    }
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black">
        <div className="absolute inset-0">
          <TourViewer
            scenes={tour.scenes}
            currentSceneId={currentSceneId}
            editMode={false}
            onPlaceHotspot={() => {}}
            onHotspotClick={handleHotspotClick}
            onSceneViewSettled={() => {}}
            renderHotspot={(h) => (
              <HotspotMarker hotspot={h} targetScene={resolveTargetScene(h, tour.scenes)} />
            )}
          />
          <SideArrows onPrev={goToPrev} onNext={goToNext} hasPrev={hasPrev} hasNext={hasNext} />
        </div>

        {tour.floorPlan?.imageUrl ? (
          <div className="pointer-events-none absolute bottom-24 left-4 sm:bottom-28">
            <FloorPlanMini
              imageUrl={tour.floorPlan.imageUrl}
              scenes={tour.scenes}
              currentSceneId={currentSceneId}
              onSelect={handleSelectScene}
            />
          </div>
        ) : null}

        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 sm:gap-3 sm:p-4">
          {!isEmbedMode && !isKioskMode ? (
            <div className="pointer-events-auto flex min-w-0 flex-col items-start gap-2">
              <div className="max-w-[60vw] rounded-lg bg-black/60 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-md sm:max-w-none sm:px-3 sm:py-2">
                <div className="truncate text-xs font-semibold sm:text-sm">{tour.title}</div>
                {tour.propertyAddress ? (
                  <div className="hidden truncate text-xs text-white/70 sm:block">{tour.propertyAddress}</div>
                ) : null}
              </div>
              {showListingDetails ? (
                <ListingDetailsOverlay details={tour.details!} variant="compact" />
              ) : null}
            </div>
          ) : (
            <div />
          )}
          {showAgentCard ? (
            <div className="pointer-events-auto">
              <AgentCard
                branding={tour.branding!}
                variant="responsive"
                onContact={handleContactClick}
              />
            </div>
          ) : null}
        </header>

        {isPreviewMode ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rotate-[-20deg] select-none rounded-md border-4 border-amber-400/40 px-12 py-6 text-7xl font-black uppercase tracking-widest text-amber-400/40">
              Draft preview
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4">
          <div className="rounded-full bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur-md">
            {currentScene.name}
            <span className="ml-2 text-white/50">
              {currentSceneIndex + 1} / {tour.scenes.length}
            </span>
          </div>
          {!isKioskMode ? (
            <div className="pointer-events-auto flex items-end gap-2">
              <PlaybackControls
                onPrev={goToPrev}
                onNext={goToNext}
                onTogglePlay={handleTogglePlay}
                isPlaying={isPlaying}
                hasPrev={hasPrev}
                hasNext={hasNext}
                variant="share"
              />
              {hasHighlights && !isPlayingHighlights ? (
                <button
                  type="button"
                  onClick={handleStartHighlights}
                  className="rounded-full bg-amber-400 px-3 py-2 text-xs font-semibold text-neutral-900 shadow-2xl hover:bg-amber-300"
                  title={`Auto-play through ${tour.highlights!.length} highlight scene${tour.highlights!.length === 1 ? "" : "s"}`}
                >
                  ★ Watch highlights
                </button>
              ) : null}
              <SceneStrip
                scenes={tour.scenes}
                currentSceneId={currentSceneId}
                onSelect={handleSelectScene}
              />
            </div>
          ) : null}
        </div>

        {/* Buyer chatbot — bottom-right, public tour only */}
        {!isKioskMode && !isPreviewMode ? (
          <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex justify-end">
            <BuyerChat
              tourSlug={tour.slug}
              agentName={!isNoBrandMode ? tour.branding?.agentName : undefined}
              agentPhotoUrl={!isNoBrandMode ? tour.branding?.agentPhotoUrl : undefined}
              primaryColor={tour.branding?.primaryColor}
            />
          </div>
        ) : null}

        {gateOpen && tour.leadGate ? (
          <LeadGateModal
            config={tour.leadGate}
            branding={isNoBrandMode ? undefined : tour.branding}
            onSubmit={handleGateSubmit}
            onSkip={() => {
              markGatePassed(tour.slug);
              setGatePassed(true);
              setGateOpen(false);
            }}
          />
        ) : null}

        {contactGateOpen && tour.leadGate ? (
          <LeadGateModal
            config={{
              ...tour.leadGate,
              headline: `Contact ${tour.branding?.agentName ?? "the agent"}`,
              subhead: "Drop your details and we'll be in touch.",
              ctaLabel: "Send",
              collectPhone: true,
            }}
            branding={isNoBrandMode ? undefined : tour.branding}
            onSubmit={(d) => {
              const source = contactSourceRef.current;
              const scenesViewed = scenesViewedRef.current.size;
              const durationMs = Date.now() - sessionStartRef.current;
              void onSubmitLead?.({
                email: d.email,
                name: d.name,
                phone: d.phone,
                preferredTime: d.preferredTime,
                source,
                scenesViewed,
                durationMs,
              });
              fireLeadWebhook(tour.webhookUrl, {
                id: newId(),
                tourSlug: tour.slug,
                email: d.email,
                name: d.name,
                phone: d.phone,
                preferredTime: d.preferredTime,
                source,
                capturedAt: new Date().toISOString(),
                scenesViewed,
                durationMs,
              });
              setContactGateOpen(false);
            }}
            onSkip={() => setContactGateOpen(false)}
          />
        ) : null}

        {infoModal ? (
          <InfoModal
            title={infoModal.title}
            body={infoModal.body}
            onClose={() => setInfoModal(null)}
          />
        ) : null}

        {imageModal ? (
          <ImageModal
            url={imageModal.url}
            caption={imageModal.caption}
            beforeUrl={imageModal.beforeUrl}
            onClose={() => setImageModal(null)}
          />
        ) : null}

        {videoModal ? (
          <VideoModal
            url={videoModal.url}
            caption={videoModal.caption}
            autoplay={videoModal.autoplay}
            onClose={() => setVideoModal(null)}
          />
        ) : null}
      </div>
    );
  }

  // EDITOR / FULL MODE
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {sidebarOpen ? (
        <>
          {/* Backdrop — mobile only — taps dismiss the drawer. */}
          <div
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed inset-y-0 left-0 z-30 flex w-[min(20rem,85vw)] flex-shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 md:static md:z-auto md:w-64"
          >
            <div className="flex items-start justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
              <div className="min-w-0">
                <a
                  href="/dashboard"
                  className="text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  ← Tours
                </a>
                <h1 className="mt-1 truncate font-semibold">{tour.title}</h1>
                <p className="text-xs text-neutral-500">
                  {tour.scenes.length} scenes · {totalHotspots} hotspots
                </p>
              </div>
              {/* Mobile-only close button. Desktop keeps the toggle in the
                  toolbar — visual symmetry isn't worth the extra clutter. */}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="-mr-1 ml-2 rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden"
                aria-label="Close scene list"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <ScenePicker
              scenes={tour.scenes}
              currentSceneId={currentSceneId}
              coverSceneId={tour.coverSceneId}
              onSelect={(id) => {
                handleSelectScene(id);
                // Auto-close drawer after a pick on mobile so the user sees
                // the viewer they just switched to.
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
              onRename={handleRenameScene}
              onSetCover={handleSetCover}
              onReorder={handleReorderScenes}
              onDelete={handleDeleteScene}
              editMode={editMode}
            />
          </aside>
        </>
      ) : null}

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded p-2 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Toggle scene list"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          <div className="hidden min-w-0 flex-1 md:block">
            <div className="truncate text-sm font-medium">{currentScene.name}</div>
            <div className="text-xs text-neutral-500">
              {currentScene.hotspots.length} hotspot{currentScene.hotspots.length === 1 ? "" : "s"} on this scene
            </div>
          </div>

          {/* On mobile the title row above is hidden (it's in the drawer);
              show a compact one-line variant so the user knows which scene
              the buttons act on without sacrificing toolbar space. */}
          <div className="min-w-0 flex-1 truncate text-sm font-medium md:hidden">
            {currentScene.name}
          </div>

          <div className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto md:max-w-none">
            {/* Edit-mode actions: hidden on mobile, exposed via the "More"
                sheet below. Desktop keeps the inline toolbar. */}
            {editMode ? (
              <div className="hidden items-center gap-1 lg:flex">
                <ToolbarButton
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="Undo (Ctrl/Cmd+Z)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 2.9L3 13" />
                  </svg>
                </ToolbarButton>
                <ToolbarButton
                  onClick={handleRedo}
                  disabled={!canRedo}
                  title="Redo (Ctrl/Cmd+Shift+Z)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 7v6h-6" />
                    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 2.9L21 13" />
                  </svg>
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-800" />
                <ToolbarButton
                  onClick={handleAiAutoName}
                  disabled={aiNamingState.running}
                  title="Use Claude vision to label each scene with a room name"
                >
                  {aiNamingState.running
                    ? `Naming ${aiNamingState.done}/${aiNamingState.total}…`
                    : "✨ AI auto-name"}
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => handleAutoDoorways("next-only")}
                  title="Add a 'next' doorway hotspot to every scene based on sidebar order"
                >
                  Auto-link →
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => handleAutoDoorways("next-and-prev")}
                  title="Add 'next' AND 'previous' doorways to every scene"
                >
                  Auto-link ⇄
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-800" />
                <ToolbarButton
                  onClick={() => setSceneToolsOpen((v) => !v)}
                  title="Align scene (tilt / opening view)"
                >
                  {sceneToolsOpen ? "Hide align" : "Align"}
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => setBrandingOpen(true)}
                  title="Branding"
                >
                  Branding
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => setHighlightsOpen(true)}
                  title="Curate highlights tour"
                >
                  Highlights{hasHighlights ? ` (${tour.highlights!.length})` : ""}
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => setFloorPlanOpen(true)}
                  title="Floor plan + scene dot map"
                >
                  Floor plan
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => setListingDetailsOpen(true)}
                  title="Listing details (price, beds, baths, expiration, webhook)"
                >
                  Listing
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => setLeadsOpen(true)}
                  title="View leads"
                >
                  Leads
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-800" />
              </div>
            ) : null}

            <a
              href={`/t/${tour.slug}?view=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-md px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 lg:inline-block dark:text-neutral-300 dark:hover:bg-neutral-800"
              title="Open the public viewer in a new tab"
            >
              Share view ↗
            </a>
            <div className="hidden lg:flex items-center gap-1">
              <ToolbarButton onClick={() => setEmbedOpen(true)} title="Embed code (iframe)">
                Embed
              </ToolbarButton>
              <ToolbarButton onClick={() => setHelpOpen(true)} title="Help and tips for what you're doing">
                Help
              </ToolbarButton>
            </div>

            {canEdit ? (
              <span
                className={`mr-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                  saveStatus === "error"
                    ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    : saveStatus === "saving"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      : saveStatus === "saved"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "text-neutral-400"
                }`}
                title={saveError ?? "Edits auto-save as you go"}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    saveStatus === "error"
                      ? "bg-red-500"
                      : saveStatus === "saving"
                        ? "animate-pulse bg-amber-500"
                        : saveStatus === "saved"
                          ? "bg-emerald-500"
                          : "bg-neutral-300 dark:bg-neutral-600"
                  }`}
                />
                {saveStatus === "saving"
                  ? "Saving…"
                  : saveStatus === "saved"
                    ? "Saved"
                    : saveStatus === "error"
                      ? "Save failed"
                      : "Auto-saves"}
              </span>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  setEditMode((v) => !v);
                  setSelectedHotspotId(null);
                }}
                className={`ml-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  editMode
                    ? "bg-amber-400 text-neutral-900 hover:bg-amber-300"
                    : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                }`}
              >
                {editMode ? "Editing" : "View mode"}
              </button>
            ) : null}

            {/* Mobile-only overflow trigger — desktop has the full toolbar
                rendered inline above. */}
            {canEdit ? (
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="ml-1 rounded-md p-2 text-neutral-700 hover:bg-neutral-100 lg:hidden dark:text-neutral-300 dark:hover:bg-neutral-800"
                aria-label="More actions"
                title="More actions"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="19" cy="12" r="1.8" />
                </svg>
              </button>
            ) : null}

            <div className="hidden lg:flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-800 pl-2 ml-1">
              <ToolbarButton onClick={handleExport} title="Download tour config as JSON">
                Export
              </ToolbarButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                  e.target.value = "";
                }}
              />
              <ToolbarButton onClick={() => fileInputRef.current?.click()}>
                Import
              </ToolbarButton>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Reset
              </button>
            </div>
          </div>
        </header>

        <div className="relative flex flex-1 overflow-hidden">
          <div className="relative flex-1">
            <TourViewer
              scenes={tour.scenes}
              currentSceneId={currentSceneId}
              editMode={editMode}
              onPlaceHotspot={handlePlaceHotspot}
              onHotspotClick={handleHotspotClick}
              onMoveHotspot={handleMoveHotspot}
              onSceneViewSettled={handleSceneViewSettled}
              applyInitialViewVersion={applyViewVersion}
              renderHotspot={(h) => (
                <HotspotMarker
                  hotspot={h}
                  selected={h.id === selectedHotspotId}
                  editMode={editMode}
                  onDelete={handleDeleteHotspot}
                  targetScene={resolveTargetScene(h, tour.scenes)}
                />
              )}
            />

            {editMode && sceneToolsOpen ? (
              <SceneTools
                scene={currentScene}
                totalScenes={tour.scenes.length}
                onUpdate={handleSceneToolsUpdate}
                onApplyToAll={handleApplyToAllScenes}
                onCaptureCurrent={handleSceneToolsCaptureCurrent}
              />
            ) : null}

            {tour.branding ? (
              <div className="pointer-events-auto absolute right-3 top-3">
                <AgentCard branding={tour.branding} variant="compact" />
              </div>
            ) : null}

            {!editMode ? (
              <SideArrows onPrev={goToPrev} onNext={goToNext} hasPrev={hasPrev} hasNext={hasNext} />
            ) : null}

            {!editMode && tour.floorPlan?.imageUrl ? (
              <div className="pointer-events-none absolute bottom-20 left-4">
                <FloorPlanMini
                  imageUrl={tour.floorPlan.imageUrl}
                  scenes={tour.scenes}
                  currentSceneId={currentSceneId}
                  onSelect={handleSelectScene}
                />
              </div>
            ) : null}

            {!editMode ? (
              <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
                <PlaybackControls
                  onPrev={goToPrev}
                  onNext={goToNext}
                  onTogglePlay={handleTogglePlay}
                  isPlaying={isPlaying}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                  variant="editor"
                />
                {hasHighlights && !isPlayingHighlights ? (
                  <button
                    type="button"
                    onClick={handleStartHighlights}
                    className="rounded-full bg-amber-400 px-3 py-2 text-xs font-semibold text-neutral-900 shadow-lg hover:bg-amber-300"
                    title={`Auto-play through ${tour.highlights!.length} highlight scene${tour.highlights!.length === 1 ? "" : "s"}`}
                  >
                    ★ Watch highlights
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white shadow-lg">
                Click panorama to drop · Drag a hotspot to move · ⌫ delete · ⌘Z undo · ⌘C/⌘V copy/paste · ⌘⇧V paste to all scenes
              </div>
            )}
          </div>

          {editMode && selectedHotspot ? (
            <HotspotPanel
              hotspot={selectedHotspot}
              scenes={tour.scenes}
              currentSceneId={currentSceneId}
              clipboardHotspot={clipboardHotspot?.hotspot ?? null}
              onUpdate={handleUpdateHotspot}
              onDelete={handleDeleteHotspot}
              onCopy={handleCopyHotspot}
              onPaste={handlePasteHotspot}
              onClose={() => setSelectedHotspotId(null)}
            />
          ) : null}
        </div>
      </div>

      {infoModal ? (
        <InfoModal
          title={infoModal.title}
          body={infoModal.body}
          onClose={() => setInfoModal(null)}
        />
      ) : null}

      {brandingOpen ? (
        <BrandingModal
          branding={tour.branding ?? {}}
          onSave={handleSaveBranding}
          onClose={() => setBrandingOpen(false)}
        />
      ) : null}

      {leadsOpen ? (
        <LeadsModal
          tourSlug={tour.slug}
          loadLeads={onLoadLeads}
          onClose={() => setLeadsOpen(false)}
        />
      ) : null}

      {highlightsOpen ? (
        <HighlightsModal
          scenes={tour.scenes}
          highlights={tour.highlights ?? []}
          onChange={handleSetHighlights}
          onClose={() => setHighlightsOpen(false)}
        />
      ) : null}

      {embedOpen ? (
        <EmbedModal tourSlug={tour.slug} onClose={() => setEmbedOpen(false)} />
      ) : null}

      {floorPlanOpen ? (
        <FloorPlanEditor
          imageUrl={tour.floorPlan?.imageUrl}
          scenes={tour.scenes}
          onSetImage={handleSetFloorPlanImage}
          onSetPosition={handleSetFloorPlanPosition}
          onClose={() => setFloorPlanOpen(false)}
        />
      ) : null}

      {listingDetailsOpen ? (
        <ListingDetailsModal
          tour={tour}
          onSave={handleSaveListingDetails}
          onClose={() => setListingDetailsOpen(false)}
        />
      ) : null}

      {imageModal ? (
        <ImageModal
          url={imageModal.url}
          caption={imageModal.caption}
          beforeUrl={imageModal.beforeUrl}
          onClose={() => setImageModal(null)}
        />
      ) : null}

      {videoModal ? (
        <VideoModal
          url={videoModal.url}
          caption={videoModal.caption}
          autoplay={videoModal.autoplay}
          onClose={() => setVideoModal(null)}
        />
      ) : null}

      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        activeContext={resolveHelpContext({
          selectedHotspotId,
          brandingOpen,
          leadsOpen,
          highlightsOpen,
          floorPlanOpen,
          sceneToolsOpen,
          listingDetailsOpen,
          editMode,
        })}
      />

      {/* Mobile-only overflow sheet — every secondary toolbar action lives
          here on phones so the top bar stays readable. md:hidden keeps it
          out of the desktop tree entirely. */}
      {moreOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 md:hidden">
          <div
            className="absolute inset-0"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl dark:bg-neutral-950"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0))" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Tour actions</div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {editMode ? (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <MobileMoreItem onClick={() => { handleUndo(); setMoreOpen(false); }} disabled={!canUndo}>
                  ↶ Undo
                </MobileMoreItem>
                <MobileMoreItem onClick={() => { handleRedo(); setMoreOpen(false); }} disabled={!canRedo}>
                  ↷ Redo
                </MobileMoreItem>
                <MobileMoreItem onClick={() => { handleAiAutoName(); setMoreOpen(false); }} disabled={aiNamingState.running}>
                  {aiNamingState.running
                    ? `Naming ${aiNamingState.done}/${aiNamingState.total}…`
                    : "✨ AI auto-name"}
                </MobileMoreItem>
                <MobileMoreItem onClick={() => { handleAutoDoorways("next-only"); setMoreOpen(false); }}>
                  Auto-link →
                </MobileMoreItem>
                <MobileMoreItem onClick={() => { handleAutoDoorways("next-and-prev"); setMoreOpen(false); }}>
                  Auto-link ⇄
                </MobileMoreItem>
                <MobileMoreItem onClick={() => { setSceneToolsOpen((v) => !v); setMoreOpen(false); }}>
                  {sceneToolsOpen ? "Hide align" : "Align"}
                </MobileMoreItem>
                <MobileMoreItem onClick={() => { setBrandingOpen(true); setMoreOpen(false); }}>
                  Branding
                </MobileMoreItem>
                <MobileMoreItem onClick={() => { setHighlightsOpen(true); setMoreOpen(false); }}>
                  Highlights{hasHighlights ? ` (${tour.highlights!.length})` : ""}
                </MobileMoreItem>
                <MobileMoreItem onClick={() => { setFloorPlanOpen(true); setMoreOpen(false); }}>
                  Floor plan
                </MobileMoreItem>
                <MobileMoreItem onClick={() => { setListingDetailsOpen(true); setMoreOpen(false); }}>
                  Listing
                </MobileMoreItem>
                <MobileMoreItem onClick={() => { setLeadsOpen(true); setMoreOpen(false); }}>
                  Leads
                </MobileMoreItem>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`/t/${tour.slug}?view=1`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-center rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Share view ↗
              </a>
              <MobileMoreItem onClick={() => { setEmbedOpen(true); setMoreOpen(false); }}>
                Embed
              </MobileMoreItem>
              <MobileMoreItem onClick={() => { setHelpOpen(true); setMoreOpen(false); }}>
                Help
              </MobileMoreItem>
              <MobileMoreItem onClick={() => { handleExport(); setMoreOpen(false); }}>
                Export
              </MobileMoreItem>
              <MobileMoreItem onClick={() => { fileInputRef.current?.click(); setMoreOpen(false); }}>
                Import
              </MobileMoreItem>
              <MobileMoreItem onClick={() => { void handleReset(); setMoreOpen(false); }} variant="danger">
                Reset
              </MobileMoreItem>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileMoreItem({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
        variant === "danger"
          ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
          : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

function resolveHelpContext({
  selectedHotspotId,
  brandingOpen,
  leadsOpen,
  highlightsOpen,
  floorPlanOpen,
  sceneToolsOpen,
  listingDetailsOpen,
  editMode,
}: {
  selectedHotspotId: string | null;
  brandingOpen: boolean;
  leadsOpen: boolean;
  highlightsOpen: boolean;
  floorPlanOpen: boolean;
  sceneToolsOpen: boolean;
  listingDetailsOpen: boolean;
  editMode: boolean;
}): EditorContext {
  if (selectedHotspotId) return "hotspots";
  if (brandingOpen || listingDetailsOpen) return "branding";
  if (leadsOpen) return "leads";
  if (highlightsOpen || floorPlanOpen || sceneToolsOpen) return "scenes";
  if (editMode) return "editor";
  return "viewer";
}

function resolveTargetScene(h: Hotspot, scenes: Scene[]): Scene | undefined {
  if (h.payload.type !== "scene_link") return undefined;
  const targetId = h.payload.data.targetSceneId;
  return scenes.find((s) => s.id === targetId);
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
