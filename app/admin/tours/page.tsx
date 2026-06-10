import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface AdminTourRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  teamName: string;
  teamPlan: string;
  scenesCount: number;
  hotspotsCount: number;
  leadsCount: number;
}

async function loadTours(): Promise<AdminTourRow[]> {
  const [tours, hotspots] = await Promise.all([
    prisma.tours.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        view_count: true,
        created_at: true,
        updated_at: true,
        teams: { select: { name: true, plan: true } },
        _count: {
          select: { scenes_scenes_tour_idTotours: true, leads: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: 200,
    }),
    prisma.hotspots.findMany({
      select: { scenes: { select: { tour_id: true } } },
    }),
  ]);

  const hotspotCount = new Map<string, number>();
  for (const h of hotspots) {
    const tourId = h.scenes?.tour_id;
    if (tourId) hotspotCount.set(tourId, (hotspotCount.get(tourId) ?? 0) + 1);
  }

  return tours.map((t) => {
    const team = t.teams;
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      status: t.status,
      viewCount: t.view_count ?? 0,
      createdAt: t.created_at.toISOString(),
      updatedAt: t.updated_at.toISOString(),
      teamName: team?.name ?? "—",
      teamPlan: team?.plan ?? "—",
      scenesCount: t._count.scenes_scenes_tour_idTotours,
      hotspotsCount: hotspotCount.get(t.id) ?? 0,
      leadsCount: t._count.leads,
    };
  });
}

export default async function AdminTours() {
  const tours = await loadTours();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tours</h1>
          <p className="text-sm text-neutral-500">All tours across every team. {tours.length} total.</p>
        </div>
        <Link href="/admin" className="text-sm text-brand-600 hover:text-brand-700">
          ← Overview
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Tour</th>
              <th className="px-5 py-2 text-left font-medium">Team</th>
              <th className="px-5 py-2 text-left font-medium">Status</th>
              <th className="px-5 py-2 text-right font-medium">Scenes</th>
              <th className="px-5 py-2 text-right font-medium">Hotspots</th>
              <th className="px-5 py-2 text-right font-medium">Views</th>
              <th className="px-5 py-2 text-right font-medium">Leads</th>
              <th className="px-5 py-2 text-left font-medium">Updated</th>
              <th className="px-5 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tours.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-neutral-500">
                  No tours yet.
                </td>
              </tr>
            ) : (
              tours.map((t) => (
                <tr key={t.id} className="border-t border-neutral-100">
                  <td className="px-5 py-2.5">
                    <Link
                      href={`/t/${t.slug}?view=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {t.title}
                    </Link>
                    <div className="text-xs text-neutral-500">/{t.slug}</div>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="font-medium text-neutral-700">{t.teamName}</div>
                    <div className="text-xs text-neutral-500">{t.teamPlan}</div>
                  </td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        t.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{t.scenesCount}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{t.hotspotsCount}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{t.viewCount}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{t.leadsCount}</td>
                  <td className="px-5 py-2.5 text-xs text-neutral-500">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <Link
                      href={`/editor/${t.id}`}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
