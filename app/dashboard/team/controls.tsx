"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTeamInvite,
  revokeTeamInvite,
  removeTeamMember,
} from "@/lib/team/invite-actions";

interface MemberRow {
  userId: string;
  email: string;
  role: "owner" | "admin" | "agent";
  joinedAt: string;
}
interface InviteRow {
  id: string;
  email: string;
  role: "owner" | "admin" | "agent";
  invitedAt: string;
  expiresAt: string;
}

export function InviteForm({ atLimit }: { atLimit: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"agent" | "admin">("agent");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const r = await createTeamInvite({ email, role });
      if (!r.ok) {
        setMessage(`Error: ${r.error}`);
        return;
      }
      const tail = r.emailed ? "Invitation email sent." : "Created — but the email didn't send (admin: paste RESEND_API_KEY in /admin/settings).";
      setMessage(`Invite created. ${tail}`);
      setEmail("");
      setRole("agent");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[240px]">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@brokerage.com"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "agent" | "admin")}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm"
        >
          <option value="agent">Agent</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending || atLimit}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
      >
        {pending ? "Sending…" : atLimit ? "At limit" : "Send invite"}
      </button>
      {message ? (
        <p
          className={`w-full text-xs ${
            message.startsWith("Error") ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function MemberList({ rows, canManage }: { rows: MemberRow[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onRemove = (userId: string, email: string) => {
    if (!window.confirm(`Remove ${email} from the team?`)) return;
    setError(null);
    startTransition(async () => {
      const r = await removeTeamMember({ userId });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  if (rows.length === 0) {
    return <p className="p-5 text-sm text-neutral-500">No members yet.</p>;
  }
  return (
    <>
      {error ? <p className="border-b border-red-100 bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
      <ul className="divide-y divide-neutral-100">
        {rows.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-4 p-4 text-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{m.email}</div>
              <div className="text-xs text-neutral-500">
                Joined {new Date(m.joinedAt).toLocaleDateString()}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                m.role === "owner"
                  ? "bg-amber-100 text-amber-800"
                  : m.role === "admin"
                    ? "bg-brand-100 text-brand-800"
                    : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {m.role}
            </span>
            {canManage && m.role !== "owner" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(m.userId, m.email)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

export function InviteList({ rows, canManage }: { rows: InviteRow[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onRevoke = (inviteId: string, email: string) => {
    if (!window.confirm(`Revoke invite for ${email}?`)) return;
    setError(null);
    startTransition(async () => {
      const r = await revokeTeamInvite({ inviteId });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      {error ? <p className="border-b border-red-100 bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
      <ul className="divide-y divide-neutral-100">
        {rows.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-4 p-4 text-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{i.email}</div>
              <div className="text-xs text-neutral-500">
                Invited {new Date(i.invitedAt).toLocaleDateString()} · expires{" "}
                {new Date(i.expiresAt).toLocaleDateString()}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
              {i.role}
            </span>
            {canManage ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => onRevoke(i.id, i.email)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
              >
                Revoke
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
