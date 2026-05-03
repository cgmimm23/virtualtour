"use client";

import type {
  ContactPayload,
  Hotspot,
  HotspotPayload,
  ImagePayload,
  InfoPayload,
  Scene,
  SceneLinkPayload,
  UrlPayload,
  VideoPayload,
} from "@/lib/tour/types";

interface HotspotPanelProps {
  hotspot: Hotspot;
  scenes: Scene[];
  currentSceneId: string;
  clipboardHotspot: Hotspot | null;
  onUpdate: (next: Hotspot) => void;
  onDelete: (hotspotId: string) => void;
  onCopy: () => void;
  onPaste: (toAllScenes: boolean) => void;
  onClose: () => void;
}

const TYPE_LABEL: Record<HotspotPayload["type"], string> = {
  scene_link: "Doorway",
  info: "Info",
  url: "URL",
  image: "Image",
  video: "Video",
  contact: "Contact",
};

export function HotspotPanel({
  hotspot,
  scenes,
  currentSceneId,
  clipboardHotspot,
  onUpdate,
  onDelete,
  onCopy,
  onPaste,
  onClose,
}: HotspotPanelProps) {
  const setType = (type: HotspotPayload["type"]) => {
    if (type === hotspot.payload.type) return;
    let payload: HotspotPayload;
    switch (type) {
      case "scene_link": {
        const firstOther = scenes.find((s) => s.id !== currentSceneId);
        payload = {
          type: "scene_link",
          data: { targetSceneId: firstOther?.id ?? scenes[0].id, transition: "fade" },
        };
        break;
      }
      case "info":
        payload = { type: "info", data: { title: "", bodyMarkdown: "" } };
        break;
      case "url":
        payload = { type: "url", data: { url: "https://", label: "" } };
        break;
      case "image":
        payload = { type: "image", data: { url: "", caption: "" } };
        break;
      case "video":
        payload = { type: "video", data: { url: "", caption: "", autoplay: false } };
        break;
      case "contact":
        payload = { type: "contact", data: { ctaLabel: "" } };
        break;
    }
    onUpdate({ ...hotspot, payload });
  };

  return (
    <aside className="flex w-80 flex-shrink-0 flex-col gap-4 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Hotspot
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Close hotspot panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Type</label>
        <div className="grid grid-cols-3 gap-1">
          {(["scene_link", "info", "url", "image", "video", "contact"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                hotspot.payload.type === t
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-300 bg-transparent hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              }`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Label (shows on hover)</label>
        <input
          value={hotspot.label}
          onChange={(e) => onUpdate({ ...hotspot, label: e.target.value })}
          placeholder={
            hotspot.payload.type === "scene_link" ? "e.g. Kitchen" : "Optional label"
          }
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:focus:border-white"
        />
      </div>

      {hotspot.payload.type === "scene_link" ? (
        <SceneLinkFields
          hotspot={hotspot}
          data={hotspot.payload.data}
          scenes={scenes}
          currentSceneId={currentSceneId}
          onUpdate={onUpdate}
        />
      ) : null}

      {hotspot.payload.type === "info" ? (
        <InfoFields hotspot={hotspot} data={hotspot.payload.data} onUpdate={onUpdate} />
      ) : null}

      {hotspot.payload.type === "url" ? (
        <UrlFields hotspot={hotspot} data={hotspot.payload.data} onUpdate={onUpdate} />
      ) : null}

      {hotspot.payload.type === "image" ? (
        <ImageFields hotspot={hotspot} data={hotspot.payload.data} onUpdate={onUpdate} />
      ) : null}

      {hotspot.payload.type === "video" ? (
        <VideoFields hotspot={hotspot} data={hotspot.payload.data} onUpdate={onUpdate} />
      ) : null}

      {hotspot.payload.type === "contact" ? (
        <ContactFields hotspot={hotspot} data={hotspot.payload.data} onUpdate={onUpdate} />
      ) : null}

      <div className="mt-2 rounded-md bg-neutral-100 dark:bg-neutral-900 p-3 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
        <div>yaw: {hotspot.yaw.toFixed(3)} rad</div>
        <div>pitch: {hotspot.pitch.toFixed(3)} rad</div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={onCopy}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Copy this hotspot (Ctrl/Cmd+C)"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => onPaste(false)}
            disabled={!clipboardHotspot}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            title="Paste here (Ctrl/Cmd+V)"
          >
            Paste here
          </button>
        </div>
        <button
          type="button"
          onClick={() => onPaste(true)}
          disabled={!clipboardHotspot}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          title="Paste into every scene (Ctrl/Cmd+Shift+V)"
        >
          Paste into all {scenes.length} scenes
        </button>
        <button
          type="button"
          onClick={() => onDelete(hotspot.id)}
          className="rounded-md border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50"
        >
          Delete hotspot
        </button>
      </div>
    </aside>
  );
}

const inputClass =
  "rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:focus:border-white";

function SceneLinkFields({
  hotspot,
  data,
  scenes,
  currentSceneId,
  onUpdate,
}: {
  hotspot: Hotspot;
  data: SceneLinkPayload;
  scenes: Scene[];
  currentSceneId: string;
  onUpdate: (next: Hotspot) => void;
}) {
  const rotation = data.arrowRotation ?? 90;
  const setRotation = (deg: number) => {
    onUpdate({
      ...hotspot,
      payload: { type: "scene_link", data: { ...data, arrowRotation: ((deg % 360) + 360) % 360 } },
    });
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Goes to scene</label>
        <select
          value={data.targetSceneId}
          onChange={(e) =>
            onUpdate({
              ...hotspot,
              payload: { type: "scene_link", data: { ...data, targetSceneId: e.target.value } },
            })
          }
          className={inputClass}
        >
          {scenes
            .filter((s) => s.id !== currentSceneId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-500">Arrow direction</label>
        <DirectionGrid rotation={rotation} onChange={setRotation} />
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right text-xs tabular-nums text-neutral-500">
            {Math.round(rotation)}°
          </span>
        </div>
      </div>
    </>
  );
}

const GRID_DIRECTIONS: Array<{ deg: number | null; label: string }> = [
  { deg: 225, label: "↖" },
  { deg: 270, label: "↑" },
  { deg: 315, label: "↗" },
  { deg: 180, label: "←" },
  { deg: null, label: "" },
  { deg: 0, label: "→" },
  { deg: 135, label: "↙" },
  { deg: 90, label: "↓" },
  { deg: 45, label: "↘" },
];

function DirectionGrid({
  rotation,
  onChange,
}: {
  rotation: number;
  onChange: (deg: number) => void;
}) {
  const isActive = (deg: number) => Math.abs(((rotation - deg + 540) % 360) - 180) > 157.5;
  return (
    <div className="grid grid-cols-3 gap-1 w-fit">
      {GRID_DIRECTIONS.map((d, i) => {
        if (d.deg === null) {
          return <div key={i} className="h-8 w-8" />;
        }
        const active = isActive(d.deg);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(d.deg!)}
            className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors ${
              active
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            }`}
            aria-label={`Arrow ${d.label}`}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

function InfoFields({
  hotspot,
  data,
  onUpdate,
}: {
  hotspot: Hotspot;
  data: InfoPayload;
  onUpdate: (next: Hotspot) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Title</label>
        <input
          value={data.title}
          onChange={(e) =>
            onUpdate({
              ...hotspot,
              payload: { type: "info", data: { ...data, title: e.target.value } },
            })
          }
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Body</label>
        <textarea
          rows={4}
          value={data.bodyMarkdown}
          onChange={(e) =>
            onUpdate({
              ...hotspot,
              payload: { type: "info", data: { ...data, bodyMarkdown: e.target.value } },
            })
          }
          className={inputClass}
        />
      </div>
    </>
  );
}

function UrlFields({
  hotspot,
  data,
  onUpdate,
}: {
  hotspot: Hotspot;
  data: UrlPayload;
  onUpdate: (next: Hotspot) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-neutral-500">URL</label>
      <input
        value={data.url}
        onChange={(e) =>
          onUpdate({
            ...hotspot,
            payload: { type: "url", data: { ...data, url: e.target.value } },
          })
        }
        className={inputClass}
      />
    </div>
  );
}

function ImageFields({
  hotspot,
  data,
  onUpdate,
}: {
  hotspot: Hotspot;
  data: ImagePayload;
  onUpdate: (next: Hotspot) => void;
}) {
  const upload = (key: "url" | "beforeUrl") => async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdate({
          ...hotspot,
          payload: { type: "image", data: { ...data, [key]: reader.result } },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Image URL or upload</label>
        <input
          value={data.url}
          onChange={(e) =>
            onUpdate({
              ...hotspot,
              payload: { type: "image", data: { ...data, url: e.target.value } },
            })
          }
          placeholder="https://… or use upload below"
          className={inputClass}
        />
        <div className="flex items-center gap-2">
          {data.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.url} alt="" className="h-10 w-10 rounded object-cover border border-neutral-200 dark:border-neutral-800" />
          ) : null}
          <label className="cursor-pointer rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload("url")(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">
          Before image (optional — turns this into a before/after slider)
        </label>
        <div className="flex items-center gap-2">
          {data.beforeUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.beforeUrl} alt="" className="h-10 w-10 rounded object-cover border border-neutral-200 dark:border-neutral-800" />
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    ...hotspot,
                    payload: { type: "image", data: { ...data, beforeUrl: undefined } },
                  })
                }
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </>
          ) : null}
          <label className="cursor-pointer rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800">
            {data.beforeUrl ? "Replace" : "Upload before image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload("beforeUrl")(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Caption</label>
        <input
          value={data.caption ?? ""}
          onChange={(e) =>
            onUpdate({
              ...hotspot,
              payload: { type: "image", data: { ...data, caption: e.target.value } },
            })
          }
          placeholder="Optional caption shown under the image"
          className={inputClass}
        />
      </div>
    </>
  );
}

function VideoFields({
  hotspot,
  data,
  onUpdate,
}: {
  hotspot: Hotspot;
  data: VideoPayload;
  onUpdate: (next: Hotspot) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">YouTube, Vimeo, or .mp4 URL</label>
        <input
          value={data.url}
          onChange={(e) =>
            onUpdate({
              ...hotspot,
              payload: { type: "video", data: { ...data, url: e.target.value } },
            })
          }
          placeholder="https://youtube.com/watch?v=… or https://…/clip.mp4"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Caption</label>
        <input
          value={data.caption ?? ""}
          onChange={(e) =>
            onUpdate({
              ...hotspot,
              payload: { type: "video", data: { ...data, caption: e.target.value } },
            })
          }
          placeholder="Optional caption"
          className={inputClass}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={data.autoplay ?? false}
          onChange={(e) =>
            onUpdate({
              ...hotspot,
              payload: { type: "video", data: { ...data, autoplay: e.target.checked } },
            })
          }
        />
        Autoplay when opened
      </label>
    </>
  );
}

function ContactFields({
  hotspot,
  data,
  onUpdate,
}: {
  hotspot: Hotspot;
  data: ContactPayload;
  onUpdate: (next: Hotspot) => void;
}) {
  return (
    <>
      <div className="rounded-md bg-neutral-100 p-3 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        Clicking this hotspot opens the contact form (same as the agent card's Contact button).
        Use it to drop a "talk to agent" trigger inside a specific room.
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-500">Button label (optional)</label>
        <input
          value={data.ctaLabel ?? ""}
          onChange={(e) =>
            onUpdate({
              ...hotspot,
              payload: { type: "contact", data: { ...data, ctaLabel: e.target.value } },
            })
          }
          placeholder="e.g. Ask about this kitchen"
          className={inputClass}
        />
      </div>
    </>
  );
}
