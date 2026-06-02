"use client";

import { useState, useTransition } from "react";
import { acceptTeamInvite } from "@/lib/team/invite-actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onAccept = () => {
    setError(null);
    startTransition(async () => {
      const r = await acceptTeamInvite({ token });
      // acceptTeamInvite calls redirect("/dashboard") on success — the line
      // below only runs on { ok: false }.
      if (!r.ok) setError(r.error);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={onAccept}
        disabled={pending}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
      >
        {pending ? "Joining…" : "Accept invite"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </>
  );
}
