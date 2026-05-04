"use client";

import { useState } from "react";
import { createTourAction } from "./actions";

export function CreateTourButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
      >
        New tour
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            action={createTourAction}
            className="w-full max-w-sm rounded-xl bg-white dark:bg-neutral-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Create a tour</h3>
            <p className="mt-1 text-xs text-neutral-500">
              You can rename and add scenes after creating it.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Title
                </label>
                <input
                  name="title"
                  required
                  placeholder="123 Main Street"
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Property address (optional)
                </label>
                <input
                  name="propertyAddress"
                  placeholder="123 Main St, Springfield, IL"
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
