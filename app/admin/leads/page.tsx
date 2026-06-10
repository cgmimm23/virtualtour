import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface AdminLeadRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  source: string;
  capturedAt: string;
  agentNotifiedAt: string | null;
  tourSlug: string;
  tourTitle: string;
  teamName: string;
}

async function loadLeads(): Promise<AdminLeadRow[]> {
  const data = await prisma.leads.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      source: true,
      captured_at: true,
      agent_notified_at: true,
      tours: {
        select: {
          slug: true,
          title: true,
          teams: { select: { name: true } },
        },
      },
    },
    orderBy: { captured_at: "desc" },
    take: 500,
  });

  return data.map((l) => {
    const tour = l.tours;
    const team = tour?.teams;
    return {
      id: l.id,
      email: l.email,
      name: l.name ?? null,
      phone: l.phone ?? null,
      source: l.source,
      capturedAt: l.captured_at.toISOString(),
      agentNotifiedAt: l.agent_notified_at ? l.agent_notified_at.toISOString() : null,
      tourSlug: tour?.slug ?? "(unknown)",
      tourTitle: tour?.title ?? "(unknown)",
      teamName: team?.name ?? "(unknown)",
    };
  });
}

export default async function AdminLeads() {
  const leads = await loadLeads();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-neutral-500">
            Every lead captured across every tour. {leads.length} total. Newest first.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-brand-600 hover:text-brand-700">
          ← Overview
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Captured</th>
              <th className="px-5 py-2 text-left font-medium">Email</th>
              <th className="px-5 py-2 text-left font-medium">Name</th>
              <th className="px-5 py-2 text-left font-medium">Phone</th>
              <th className="px-5 py-2 text-left font-medium">Source</th>
              <th className="px-5 py-2 text-left font-medium">Tour</th>
              <th className="px-5 py-2 text-left font-medium">Team</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-neutral-500">
                  No leads captured yet. Submit one through the public viewer to test.
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="border-t border-neutral-100">
                  <td className="px-5 py-2.5 text-xs text-neutral-500">
                    {new Date(l.capturedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-2.5">
                    <a href={`mailto:${l.email}`} className="text-brand-700 hover:underline">
                      {l.email}
                    </a>
                  </td>
                  <td className="px-5 py-2.5">{l.name ?? "—"}</td>
                  <td className="px-5 py-2.5">
                    {l.phone ? (
                      <a href={`tel:${l.phone}`} className="text-brand-700 hover:underline">
                        {l.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-600">
                      {l.source}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <Link
                      href={`/t/${l.tourSlug}?view=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 hover:underline"
                    >
                      {l.tourTitle}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-xs text-neutral-700">{l.teamName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
