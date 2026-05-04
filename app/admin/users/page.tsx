import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AdminUserRow {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  teamName: string | null;
  teamPlan: string | null;
  role: string | null;
  isPlatformAdmin: boolean;
  toursCount: number;
}

async function loadUsers(): Promise<AdminUserRow[]> {
  const supabase = createAdminClient();

  const [{ data: usersResp }, { data: memberships }, { data: platformAdmins }, { data: toursByTeam }] =
    await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabase.from("team_members").select("user_id, role, team:teams(id, name, plan)"),
      supabase.from("platform_admins").select("user_id"),
      supabase.from("tours").select("team_id"),
    ]);

  const users = usersResp?.users ?? [];
  const adminSet = new Set((platformAdmins ?? []).map((p) => p.user_id));
  const tourCountByTeam = new Map<string, number>();
  for (const t of toursByTeam ?? []) {
    tourCountByTeam.set(t.team_id, (tourCountByTeam.get(t.team_id) ?? 0) + 1);
  }

  const membershipByUser = new Map<
    string,
    { role: string; teamId: string; teamName: string; teamPlan: string }
  >();
  for (const m of memberships ?? []) {
    const team = Array.isArray(m.team) ? m.team[0] : m.team;
    if (!team) continue;
    membershipByUser.set(m.user_id, {
      role: m.role,
      teamId: team.id,
      teamName: team.name,
      teamPlan: team.plan,
    });
  }

  return users.map((u) => {
    const m = membershipByUser.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "(no email)",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      teamName: m?.teamName ?? null,
      teamPlan: m?.teamPlan ?? null,
      role: m?.role ?? null,
      isPlatformAdmin: adminSet.has(u.id),
      toursCount: m ? tourCountByTeam.get(m.teamId) ?? 0 : 0,
    };
  });
}

export default async function AdminUsers() {
  const users = await loadUsers();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-neutral-500">
            All authed accounts across all teams. {users.length} total.
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
              <th className="px-5 py-2 text-left font-medium">Email</th>
              <th className="px-5 py-2 text-left font-medium">Team</th>
              <th className="px-5 py-2 text-left font-medium">Plan</th>
              <th className="px-5 py-2 text-left font-medium">Role</th>
              <th className="px-5 py-2 text-right font-medium">Tours</th>
              <th className="px-5 py-2 text-left font-medium">Joined</th>
              <th className="px-5 py-2 text-left font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-neutral-500">
                  No users yet. Sign up at <Link href="/signup" className="text-brand-600 underline">/signup</Link>.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-neutral-100 align-middle">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{u.email}</span>
                      {u.isPlatformAdmin ? (
                        <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-600">
                          Admin
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-neutral-700">{u.teamName ?? "—"}</td>
                  <td className="px-5 py-2.5">
                    {u.teamPlan ? (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-700">
                        {u.teamPlan}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-neutral-600">{u.role ?? "—"}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{u.toursCount}</td>
                  <td className="px-5 py-2.5 text-xs text-neutral-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-neutral-500">
                    {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString() : "never"}
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
