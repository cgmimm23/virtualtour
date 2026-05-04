import Link from "next/link";
import type { ReactNode } from "react";

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
      {children}
    </p>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 leading-relaxed text-neutral-700 dark:text-neutral-300">
      {children}
    </p>
  );
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-24 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
    >
      {children}
    </h2>
  );
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3
      id={id}
      className="mt-8 scroll-mt-24 text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
    >
      {children}
    </h3>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-neutral-700 dark:text-neutral-300 marker:text-neutral-400">
      {children}
    </ul>
  );
}

export function OL({ children }: { children: ReactNode }) {
  return (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-neutral-700 dark:text-neutral-300 marker:text-neutral-400">
      {children}
    </ol>
  );
}

export function LI({ children }: { children: ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{children}</strong>;
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.9em] text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
      {children}
    </code>
  );
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const isInternal = href.startsWith("/");
  if (isInternal) {
    return (
      <Link href={href} className="text-amber-600 underline-offset-2 hover:underline dark:text-amber-400">
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
    >
      {children}
    </a>
  );
}

type CalloutTone = "info" | "warn" | "tip" | "do" | "dont";

const calloutStyles: Record<CalloutTone, { ring: string; bg: string; text: string; label: string; icon: ReactNode }> = {
  info: {
    ring: "ring-sky-200 dark:ring-sky-900",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-900 dark:text-sky-100",
    label: "Note",
    icon: <CircleI />,
  },
  warn: {
    ring: "ring-amber-300 dark:ring-amber-900",
    bg: "bg-brand-50 dark:bg-amber-950/40",
    text: "text-amber-900 dark:text-amber-100",
    label: "Heads up",
    icon: <Triangle />,
  },
  tip: {
    ring: "ring-emerald-200 dark:ring-emerald-900",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-900 dark:text-emerald-100",
    label: "Tip",
    icon: <Spark />,
  },
  do: {
    ring: "ring-emerald-200 dark:ring-emerald-900",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-900 dark:text-emerald-100",
    label: "Do",
    icon: <Check />,
  },
  dont: {
    ring: "ring-rose-200 dark:ring-rose-900",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-900 dark:text-rose-100",
    label: "Don't",
    icon: <X />,
  },
};

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
}) {
  const s = calloutStyles[tone];
  return (
    <div className={`mt-6 rounded-xl ${s.bg} ${s.text} p-4 ring-1 ${s.ring}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80">
        <span className="flex h-4 w-4 items-center justify-center">{s.icon}</span>
        {title ?? s.label}
      </div>
      <div className="mt-2 text-sm leading-relaxed [&>p]:mt-0 [&>p+p]:mt-3">{children}</div>
    </div>
  );
}

export function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((it) => (
        <li
          key={it}
          className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
        >
          <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-neutral-300 dark:border-neutral-700">
            <Check />
          </span>
          <span className="text-neutral-700 dark:text-neutral-300">{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function CompareTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-neutral-50 dark:bg-neutral-900">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-neutral-50/50 dark:even:bg-neutral-900/30">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-t border-neutral-200 px-4 py-3 align-top text-neutral-700 dark:border-neutral-800 dark:text-neutral-300"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function KeyValue({ items }: { items: Array<{ k: string; v: ReactNode }> }) {
  return (
    <dl className="mt-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-5 text-sm dark:border-neutral-800 dark:bg-neutral-950 sm:grid-cols-[max-content_1fr] sm:gap-x-6">
      {items.map((it) => (
        <div key={it.k} className="contents">
          <dt className="font-semibold text-neutral-900 dark:text-neutral-100">{it.k}</dt>
          <dd className="text-neutral-600 dark:text-neutral-400">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function CircleI() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
function Triangle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function Spark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4" />
    </svg>
  );
}
function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function X() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
