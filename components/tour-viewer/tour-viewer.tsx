"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Hotspot, Scene } from "@/lib/tour/types";

type MarzipanoModule = typeof import("marzipano");
type MViewer = import("marzipano").Viewer;
type MScene = import("marzipano").Scene;
type MHotspot = import("marzipano").Hotspot;

interface TourViewerProps {
  scenes: Scene[];
  currentSceneId: string;
  editMode: boolean;
  onPlaceHotspot: (yaw: number, pitch: number) => void;
  onHotspotClick: (hotspot: Hotspot) => void;
  onMoveHotspot?: (hotspotId: string, yaw: number, pitch: number) => void;
  onSceneViewSettled?: (sceneId: string, view: { yaw: number; pitch: number; fov: number; roll: number }) => void;
  /** Imperative handle: when this version number changes, re-apply scene initial view from props. */
  applyInitialViewVersion?: number;
  /** Render a React node into the Marzipano hotspot for a given hotspot id. */
  renderHotspot: (hotspot: Hotspot) => React.ReactNode;
}

/**
 * Marzipano wrapper. Lifecycle:
 *  - mount → dynamic-import Marzipano, create Viewer + one Scene per props.scenes
 *  - currentSceneId change → call scene.switchTo()
 *  - hotspots change for a scene → rebuild that scene's hotspot DOM nodes
 *  - editMode change → toggle viewer click-to-place handler
 *  - unmount → viewer.destroy() (releases the WebGL context)
 */
export function TourViewer({
  scenes,
  currentSceneId,
  editMode,
  onPlaceHotspot,
  onHotspotClick,
  onMoveHotspot,
  onSceneViewSettled,
  applyInitialViewVersion,
  renderHotspot,
}: TourViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<MViewer | null>(null);
  const sceneMapRef = useRef<Map<string, MScene>>(new Map());
  const hotspotHandlesRef = useRef<Map<string, { hotspot: MHotspot; element: HTMLDivElement }>>(new Map());
  const [, forceRender] = useState(0);

  // Cache latest callbacks so we don't re-init the viewer when they change.
  const onPlaceHotspotRef = useRef(onPlaceHotspot);
  const onHotspotClickRef = useRef(onHotspotClick);
  const onMoveHotspotRef = useRef(onMoveHotspot);
  const onSceneViewSettledRef = useRef(onSceneViewSettled);
  const currentSceneIdRef = useRef(currentSceneId);
  const editModeRef = useRef(editMode);
  useEffect(() => { onPlaceHotspotRef.current = onPlaceHotspot; }, [onPlaceHotspot]);
  useEffect(() => { onHotspotClickRef.current = onHotspotClick; }, [onHotspotClick]);
  useEffect(() => { onMoveHotspotRef.current = onMoveHotspot; }, [onMoveHotspot]);
  useEffect(() => { onSceneViewSettledRef.current = onSceneViewSettled; }, [onSceneViewSettled]);
  useEffect(() => { currentSceneIdRef.current = currentSceneId; }, [currentSceneId]);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);

  // Init viewer + create all scenes once. Re-runs only if the scene list itself
  // changes shape (id list), not on hotspot edits.
  const sceneIdsKey = scenes.map((s) => s.id).join(",");

  useEffect(() => {
    let cancelled = false;
    let viewer: MViewer | null = null;

    void (async () => {
      // marzipano is CommonJS. Webpack wraps the module so the namespace might
      // be on the default export; fall back to the namespace itself for safety.
      const mod = (await import("marzipano")) as unknown as { default?: MarzipanoModule } & MarzipanoModule;
      const Marzipano = (mod.default ?? mod) as MarzipanoModule;
      if (cancelled || !containerRef.current) return;

      viewer = new Marzipano.Viewer(containerRef.current, {
        controls: { mouseViewMode: "drag" },
      });
      viewerRef.current = viewer;

      // Bump the FOV limit so the mobile widen-on-load below has headroom.
      const limiter = Marzipano.RectilinearView.limit.traditional(
        4096,
        (140 * Math.PI) / 180,
      );
      const geometry = new Marzipano.EquirectGeometry([{ width: 4096 }]);

      // On phone-width viewports the saved FOV (90° default) feels zoomed
      // in — the canvas is narrow, so less of the scene is visible and
      // the visitor loses the depth of the room. Bump opening FOV wider
      // on small / medium screens so the scene reads more naturally.
      const w = typeof window !== "undefined" ? window.innerWidth : 1024;
      const mobileFov =
        w < 480
          ? (130 * Math.PI) / 180 // narrow phones — go widest
          : w < 768
            ? (120 * Math.PI) / 180 // large phones / portrait tablets
            : 0; // desktop — respect saved FOV

      const map = new Map<string, MScene>();
      for (const s of scenes) {
        const view = new Marzipano.RectilinearView(
          {
            yaw: s.initialYaw,
            pitch: s.initialPitch,
            fov: mobileFov > 0 ? Math.max(s.initialFov, mobileFov) : s.initialFov,
            roll: s.initialRoll ?? 0,
          },
          limiter,
        );
        const source = Marzipano.ImageUrlSource.fromString(s.imageUrl);
        const mScene = viewer.createScene({ source, geometry, view });
        map.set(s.id, mScene);
      }
      sceneMapRef.current = map;

      // Activate whichever scene is current at the moment init finishes —
      // Marzipano renders nothing until a scene is switched in.
      const startId = currentSceneIdRef.current;
      const startScene = map.get(startId) ?? map.values().next().value;
      startScene?.switchTo();

      // Trigger render so hotspot portals can mount once scenes exist.
      forceRender((n) => n + 1);
    })();

    return () => {
      cancelled = true;
      hotspotHandlesRef.current.clear();
      sceneMapRef.current.clear();
      if (viewer) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIdsKey]);

  // Switch scene when currentSceneId changes.
  useEffect(() => {
    const scene = sceneMapRef.current.get(currentSceneId);
    if (!scene) return;
    scene.switchTo({ transitionDuration: 600 });
  }, [currentSceneId]);

  // Click-to-place handler (edit mode only).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !editMode) return;

    let downX = 0;
    let downY = 0;
    let downTime = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downTime = Date.now();
    };

    const onPointerUp = (e: PointerEvent) => {
      // Distinguish click from drag — Marzipano uses drag for panning.
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const elapsed = Date.now() - downTime;
      if (distance > 6 || elapsed > 400) return;

      // Ignore clicks that landed on an existing hotspot DOM element.
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-tour-hotspot]")) return;

      const viewer = viewerRef.current;
      const view = viewer?.view();
      if (!view) return;

      const rect = container.getBoundingClientRect();
      const coords = view.screenToCoordinates({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      onPlaceHotspotRef.current(coords.yaw, coords.pitch);
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointerup", onPointerUp);
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerup", onPointerUp);
    };
  }, [editMode]);

  // Sync hotspots for the current scene.
  const currentScene = scenes.find((s) => s.id === currentSceneId);
  const hotspotsKey = currentScene?.hotspots
    .map((h) => `${h.id}:${h.yaw.toFixed(4)}:${h.pitch.toFixed(4)}`)
    .join("|");

  useEffect(() => {
    const mScene = sceneMapRef.current.get(currentSceneId);
    if (!mScene) return;

    const container = mScene.hotspotContainer();

    // Tear down previous hotspot handles for this scene.
    for (const [, handle] of hotspotHandlesRef.current) {
      try {
        container.destroyHotspot(handle.hotspot);
      } catch {
        // hotspot may belong to a different scene — ignore
      }
    }
    hotspotHandlesRef.current.clear();

    if (!currentScene) return;

    for (const h of currentScene.hotspots) {
      const el = document.createElement("div");
      el.dataset.tourHotspot = h.id;
      el.style.pointerEvents = "auto";
      const mHotspot = container.createHotspot(el, { yaw: h.yaw, pitch: h.pitch });
      hotspotHandlesRef.current.set(h.id, { hotspot: mHotspot, element: el });

      // Drag-to-reposition (edit mode only). We attach pointerdown
      // unconditionally and gate on editModeRef so handlers see the live value.
      attachDragHandlers({
        hotspotId: h.id,
        el,
        mHotspot,
        viewerContainer: containerRef.current,
        editModeRef,
        viewerRef,
        onMoveCommit: (yaw, pitch) => onMoveHotspotRef.current?.(h.id, yaw, pitch),
      });
    }

    forceRender((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, hotspotsKey, sceneIdsKey]);

  // Save view orientation when user stops moving (best-effort: poll briefly after
  // any pointerup to capture the resting view).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onPointerUp = () => {
      window.setTimeout(() => {
        const view = viewerRef.current?.view();
        if (!view) return;
        onSceneViewSettledRef.current?.(currentSceneId, {
          yaw: view.yaw(),
          pitch: view.pitch(),
          fov: view.fov(),
          roll: view.roll(),
        });
      }, 250);
    };
    container.addEventListener("pointerup", onPointerUp);
    return () => container.removeEventListener("pointerup", onPointerUp);
  }, [currentSceneId]);

  // Imperative re-apply of the initial view (roll/yaw/pitch/fov) when the
  // parent bumps the version. Used by the Scene-tools panel so a roll slider
  // change is reflected live without rebuilding the scene.
  useEffect(() => {
    if (applyInitialViewVersion === undefined) return;
    const view = viewerRef.current?.view();
    const scene = scenes.find((s) => s.id === currentSceneId);
    if (!view || !scene) return;
    view.setParameters({
      yaw: scene.initialYaw,
      pitch: scene.initialPitch,
      fov: scene.initialFov,
      roll: scene.initialRoll ?? 0,
    });
  }, [applyInitialViewVersion, currentSceneId, scenes]);

  return (
    <div className="tour-stage" ref={containerRef}>
      {currentScene?.hotspots.map((h) => {
        const handle = hotspotHandlesRef.current.get(h.id);
        if (!handle) return null;
        return createPortal(
          <div
            onClick={(e) => {
              e.stopPropagation();
              onHotspotClick(h);
            }}
          >
            {renderHotspot(h)}
          </div>,
          handle.element,
          h.id,
        );
      })}
    </div>
  );
}

const DRAG_THRESHOLD_PX = 4;

function attachDragHandlers({
  hotspotId,
  el,
  mHotspot,
  viewerContainer,
  editModeRef,
  viewerRef,
  onMoveCommit,
}: {
  hotspotId: string;
  el: HTMLDivElement;
  mHotspot: MHotspot;
  viewerContainer: HTMLDivElement | null;
  editModeRef: React.MutableRefObject<boolean>;
  viewerRef: React.MutableRefObject<MViewer | null>;
  onMoveCommit: (yaw: number, pitch: number) => void;
}) {
  if (!viewerContainer) return;

  const onPointerDown = (downEvent: PointerEvent) => {
    if (!editModeRef.current) return;
    // Don't start a drag if the user pressed on the X delete button or any
    // child element that has its own click handling concern.
    const target = downEvent.target as HTMLElement | null;
    if (target?.closest("button[aria-label='Delete hotspot']")) return;

    // Block Marzipano from interpreting this as a panorama pan.
    downEvent.stopPropagation();

    const startX = downEvent.clientX;
    const startY = downEvent.clientY;
    let didDrag = false;
    let lastCoords: { yaw: number; pitch: number } | null = null;

    const updateFromEvent = (e: PointerEvent) => {
      const view = viewerRef.current?.view();
      if (!view) return;
      const rect = viewerContainer.getBoundingClientRect();
      const coords = view.screenToCoordinates({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      lastCoords = coords;
      mHotspot.setPosition(coords);
    };

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!didDrag && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      didDrag = true;
      el.style.cursor = "grabbing";
      updateFromEvent(e);
    };

    const onUp = (e: PointerEvent) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      el.style.cursor = "";
      if (!didDrag) return;
      updateFromEvent(e);
      if (lastCoords) onMoveCommit(lastCoords.yaw, lastCoords.pitch);

      // Suppress the synthetic click that fires after pointerup so this drag
      // doesn't also trigger select-on-click in the parent portal wrapper.
      const suppressClick = (clickEvent: MouseEvent) => {
        clickEvent.stopPropagation();
        clickEvent.preventDefault();
        el.removeEventListener("click", suppressClick, true);
      };
      el.addEventListener("click", suppressClick, true);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  el.dataset.dragHotspotId = hotspotId;
  el.style.cursor = "grab";
  el.addEventListener("pointerdown", onPointerDown);
}
