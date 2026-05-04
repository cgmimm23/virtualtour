import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const supabase = createAdminClient();
  const [{ data: tours }, { data: scenes }, { data: hotspots }, { data: leads }] = await Promise.all([
    supabase
      .from("tours")
      .select("id, slug, title, status, view_count, created_at, updated_at, team:teams(name, plan)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("scenes").select("tour_id"),
    supabase.from("hotspots").select("scene_id, scene:scenes(tour_id)"),
    supabase.from("leads").select("tour_id"),
  ]);

  const sceneCount = new Map<string, number>();
  for (const s of scenes ?? []) sceneCount.set(s.tour_id, (sceneCount.get(s.tour_id) ?? 0) + 1);

  const hotspotCount = new Map<string, number>();
  for (const h of hotspots ?? []) {
    const scene = Array.isArray(h.scene) ? h.scene[0] : h.scene;
    if (scene?.tour_id) hotspotCount.set(scene.tour_id, (hotspotCount.get(scene.tour_id) ?? 0) + 1);
  }

  const leadCount = new Map<string, number>();
  for (const l of leads ?? []) leadCount.set(l.tour_id, (leadCount.get(l.tour_id) ?? 0) + 1);

  return (tours ?? []).map((t) => {
    const team = Array.isArray(t.team) ? t.team[0] : t.team;
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      status: t.status,
      viewCount: t.view_count ?? 0,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      teamName: team?.name ?? "—",
      teamPlan: team?.plan ?? "—",
      scenesCount: sceneCount.get(t.id) ?? 0,
      hotspotsCount: hotspotCount.get(t.id) ?? 0,
      leadsCount: leadCount.get(t.id) ?? 0,
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
            </tr>
          </thead>
          <tbody>
            {tours.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-neutral-500">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
