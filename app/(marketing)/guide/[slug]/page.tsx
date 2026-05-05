import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ARTICLES,
  getArticle,
  getArticleNeighbors,
} from "../_content/registry";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/guide/${slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `/guide/${slug}`,
      type: "article",
      section: article.section,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

export default async function GuideArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const { prev, next } = getArticleNeighbors(slug);
  const Article = article.Article;
  const indexInAll = ARTICLES.findIndex((a) => a.slug === slug);

  return (
    <article className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <nav className="text-xs text-neutral-500">
        <Link href="/guide" className="hover:text-neutral-900 dark:hover:text-neutral-100">
          Guide
        </Link>
        <span className="mx-1.5 text-neutral-300 dark:text-neutral-700">/</span>
        <span className="text-neutral-700 dark:text-neutral-300">{article.section}</span>
      </nav>

      <header className="mt-3 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 md:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
          {article.description}
        </p>
        <div className="mt-4 flex items-center gap-3 text-xs text-neutral-500">
          <span>Chapter {indexInAll + 1} of {ARTICLES.length}</span>
          <span aria-hidden>·</span>
          <span>{article.readMinutes} min read</span>
        </div>
      </header>

      <div className="text-base">
        <Article />
      </div>

      {/* CTA — every article funnels back to a live virtual tour example. */}
      <aside className="my-10 rounded-xl border border-brand-200 bg-brand-50 p-6">
        <h2 className="text-lg font-semibold text-brand-700">
          See a live real-estate virtual tour
        </h2>
        <p className="mt-1 text-sm text-neutral-700">
          The concepts in this chapter are easier to internalize when you&apos;re looking
          at the real thing. Open the Kremmen Place virtual tour to see hotspots,
          lead capture, agent branding, and the AI-named rooms in action.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/t/kremmen-place?view=1"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Open the live virtual tour →
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
          >
            Start your own virtual tour (free trial)
          </Link>
        </div>
      </aside>

      <footer className="mt-16 border-t border-neutral-200 pt-8 dark:border-neutral-800">
        <div className="grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/guide/${prev.slug}`}
              className="group rounded-xl border border-neutral-200 p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
            >
              <div className="text-xs text-neutral-500">← Previous</div>
              <div className="mt-1 font-semibold text-neutral-900 group-hover:text-brand-600">
                {prev.title}
              </div>
            </Link>
          ) : <div />}
          {next ? (
            <Link
              href={`/guide/${next.slug}`}
              className="group rounded-xl border border-neutral-200 p-4 text-right transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 sm:col-start-2"
            >
              <div className="text-xs text-neutral-500">Next →</div>
              <div className="mt-1 font-semibold text-neutral-900 group-hover:text-brand-600">
                {next.title}
              </div>
            </Link>
          ) : null}
        </div>

        <div className="mt-10 text-center text-sm text-neutral-500">
          <Link href="/guide" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            ← Back to all chapters
          </Link>
        </div>
      </footer>
    </article>
  );
}
