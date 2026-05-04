import { listLeadsForTeam } from "@/lib/tour/lead-actions";
import { leadScore, leadScoreLabel } from "@/lib/tour/leads";
import Link from "next/link";

export const metadata = { title: "Leads — Tourly" };

export default async function LeadsPage() {
  const leads = await listLeadsForTeam();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="text-sm text-neutral-500">
          {leads.length} captured across all of your tours.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center">
          <p className="text-sm text-neutral-500">
            No leads yet. Once a viewer fills the email gate on one of your tours, they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Score</th>
                <th className="px-4 py-2 text-left font-medium">Captured</th>
                <th className="px-4 py-2 text-left font-medium">Tour</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Phone</th>
                <th className="px-4 py-2 text-left font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
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
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${labelClass}`}>
                        {label}
                      </span>
                      <span className="ml-2 text-xs tabular-nums text-neutral-500">{score}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-neutral-500">
                      {new Date(l.capturedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/editor/${l.tourId}`} className="hover:underline">
                        {l.tourTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{l.name ?? "—"}</td>
                    <td className="px-4 py-2 truncate">
                      <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>
                    </td>
                    <td className="px-4 py-2">{l.phone ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-neutral-500">
                      {l.source.replace(/_/g, " ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
