"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetState } from "./actions";

const initial: ResetState = {};

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
          New password
        </label>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none"
        />
        <p className="mt-1 text-xs text-neutral-500">8+ characters.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
          Confirm new password
        </label>
        <input
          type="password"
          name="confirm"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
      >
        {pending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
