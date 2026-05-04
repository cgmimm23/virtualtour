"use client";

import { useActionState } from "react";
import { signupAction } from "./actions";
import type { AuthFormState } from "../login/actions";

const initial: AuthFormState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
          Work email
        </label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
          Password
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
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
