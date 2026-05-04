"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTeamPlan, deleteTeam } from "@/lib/stripe/billing-actions";

const PLANS: Array<{ value: "trial" | "solo" | "team" | "brokerage"; label: string }> = [
  { value: "trial", label: "Trial (free)" },
  { value: "solo", label: "Solo ($29/mo)" },
  { value: "team", label: "Team ($79/mo)" },
  { value: "brokerage", label: "Brokerage ($199/mo)" },
];

interface TeamPlanControlsProps {
  teamId: string;
  currentPlan: string;
  teamName: string;
}

export function TeamPlanControls({ teamId, currentPlan, teamName }: TeamPlanControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState<string>(currentPlan);
  const [message, setMessage] = useState<string | null>(null);

  const onApply = () => {
    if (target === currentPlan) {
      setMessage("Already on this plan.");
      return;
    }
    startTransition(async () => {
      const r = await setTeamPlan({ teamId, toPlan: target, reason: reason || undefined });
      if (r.ok) {
        setMessage("Plan updated.");
        setReason("");
        router.refresh();
      } else {
        setMessage(`Error: ${r.error}`);
      }
    });
  };

  const onDelete = () => {
    if (
      !confirm(
        `Delete team "${teamName}" and ALL its tours, scenes, hotspots, leads, and members? This is permanent. The Stripe subscription is NOT cancelled — handle that in the Stripe dashboard separately.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await deleteTeam({ teamId, confirm: true });
      if (r.ok) {
        router.push("/admin/billing");
      } else {
        setMessage(`Error: ${r.error}`);
      }
    });
  };

  return (
    <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Override plan
        </label>
        <div className="mt-1 flex gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
          >
            {PLANS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
                {p.value === currentPlan ? " (current)" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onApply}
            disabled={pending || target === currentPlan}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {pending ? "…" : "Apply"}
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-500">Reason (audit log)</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. comp for partner, manual upgrade"
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
        />
      </div>

      {message ? (
        <p
          className={`text-xs ${
            message.startsWith("Error") ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {message}
        </p>
      ) : null}

      <p className="rounded-md bg-amber-50 p-2 text-[11px] text-amber-800">
        ⚠️ Manual plan change writes to <code>teams.plan</code> + audit log only. It does NOT
        update the Stripe subscription. Use this for comps/overrides; for real billing changes
        edit the subscription in Stripe.
      </p>

      <div className="border-t border-neutral-100 pt-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="w-full rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
        >
          Delete team
        </button>
      </div>
    </div>
  );
}
