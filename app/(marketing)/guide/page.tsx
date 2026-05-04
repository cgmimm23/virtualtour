import Link from "next/link";
import type { Metadata } from "next";
import { ARTICLES, SECTION_BLURB, SECTION_ORDER } from "./_content/registry";

export const metadata: Metadata = {
  title: "The Tourly Guide — everything about making 360° real-estate tours",
  description:
    "Free, opinionated guide to shooting, building, and publishing virtual tours that actually capture leads. Cameras, exposure, hotspots, branding, distribution.",
};

export default function GuideIndex() {
  return (
    <>
      <section className="border-b border-neutral-200 dark:border-neutral-800 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
            The Tourly Guide
          </span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Everything about making 360° tours.
          </h1>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            A short, opinionated path from holding a 360 camera for the first time to a published,
            lead-capturing tour on a real listing. Read in order or jump to what you need.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/guide/${ARTICLES[0].slug}`}
              className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              Start from the beginning →
            </Link>
            <Link
              href="/t/kremmen-place?view=1"
              className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
            >
              See a finished tour
            </Link>
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            {ARTICLES.length} chapters · ~
            {ARTICLES.reduce((n, a) => n + a.readMinutes, 0)} min total · free, no signup
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-6">
          {SECTION_ORDER.map((section) => {
            const items = ARTICLES.filter((a) => a.section === section);
            return (
              <div key={section} className="mb-14">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight">{section}</h2>
                  <span className="text-xs text-neutral-500">
                    {items.length} chapter{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {SECTION_BLURB[section]}
                </p>
                <ol className="mt-6 space-y-3">
                  {items.map((a, idx) => {
                    const globalIndex = ARTICLES.findIndex((x) => x.slug === a.slug);
                    return (
                      <li key={a.slug}>
                        <Link
                          href={`/guide/${a.slug}`}
                          className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
                        >
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-600 group-hover:bg-amber-100 group-hover:text-amber-700 dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-amber-950 dark:group-hover:text-amber-400">
                            {globalIndex + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {a.title}
                              </h3>
                              <span className="flex-shrink-0 text-xs text-neutral-500">
                                {a.readMinutes} min
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                              {a.description}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Ready to try it on a real listing?</h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Bring any 360 camera and the listing you took this morning. The guide will walk
            you through the rest.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            Create an account to start →
          </Link>
        </div>
      </section>
    </>
  );
}
