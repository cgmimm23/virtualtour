"use client";

interface InfoModalProps {
  title: string;
  body: string;
  onClose: () => void;
}

export function InfoModal({ title, body, onClose }: InfoModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full rounded-xl bg-white dark:bg-neutral-950 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{title || "Info"}</h3>
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
        {body ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
            {body}
          </p>
        ) : null}
      </div>
    </div>
  );
}
