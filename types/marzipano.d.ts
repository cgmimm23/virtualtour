// Minimal Marzipano type shim. Marzipano has no official @types package.
// This covers the surface we actually use; expand as needed.

declare module "marzipano" {
  export class Viewer {
    constructor(domElement: HTMLElement, opts?: ViewerOptions);
    createScene(opts: CreateSceneOptions): Scene;
    scene(): Scene | null;
    destroy(): void;
    domElement(): HTMLElement;
    stage(): Stage;
    view(): RectilinearView | null;
  }

  export interface ViewerOptions {
    controls?: { mouseViewMode?: "drag" | "qtvr" };
    stage?: { progressive?: boolean };
  }

  export interface CreateSceneOptions {
    source: ImageUrlSource;
    geometry: EquirectGeometry;
    view: RectilinearView;
    pinFirstLevel?: boolean;
  }

  export class Scene {
    switchTo(opts?: { transitionDuration?: number }): void;
    hotspotContainer(): HotspotContainer;
    view(): RectilinearView;
    viewer(): Viewer;
  }

  export class HotspotContainer {
    createHotspot(
      domElement: HTMLElement,
      coords: { yaw: number; pitch: number },
      opts?: HotspotOptions
    ): Hotspot;
    listHotspots(): Hotspot[];
    destroyHotspot(hotspot: Hotspot): void;
  }

  export interface HotspotOptions {
    perspective?: { radius?: number; extraTransforms?: string };
  }

  export class Hotspot {
    domElement(): HTMLElement;
    setPosition(coords: { yaw: number; pitch: number }): void;
    position(): { yaw: number; pitch: number };
    destroy(): void;
  }

  export class RectilinearView {
    constructor(
      params?: { yaw?: number; pitch?: number; fov?: number; roll?: number },
      limiter?: ViewLimiter
    );
    yaw(): number;
    pitch(): number;
    fov(): number;
    roll(): number;
    setYaw(yaw: number): void;
    setPitch(pitch: number): void;
    setFov(fov: number): void;
    setRoll(roll: number): void;
    screenToCoordinates(coords: { x: number; y: number }): { yaw: number; pitch: number };
    coordinatesToScreen(coords: { yaw: number; pitch: number }): { x: number; y: number } | null;
    setParameters(params: { yaw?: number; pitch?: number; fov?: number; roll?: number }): void;

    static limit: {
      traditional(maxResolution: number, maxFov: number): ViewLimiter;
    };
  }

  export type ViewLimiter = (params: unknown) => unknown;

  export class ImageUrlSource {
    static fromString(url: string): ImageUrlSource;
  }

  export class EquirectGeometry {
    constructor(levels: Array<{ width: number }>);
  }

  export class Stage {
    width(): number;
    height(): number;
  }

  const Marzipano: {
    Viewer: typeof Viewer;
    RectilinearView: typeof RectilinearView;
    ImageUrlSource: typeof ImageUrlSource;
    EquirectGeometry: typeof EquirectGeometry;
  };

  export default Marzipano;
}
