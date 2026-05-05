import type { MetadataRoute } from "next";
import { ARTICLES_META } from "@/app/(marketing)/guide/_content/meta";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/guide`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
  ];

  const guideArticles: MetadataRoute.Sitemap = ARTICLES_META.map((a) => ({
    url: `${BASE_URL}/guide/${a.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Public tour pages — pull every published tour from the DB.
  let tourPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createAdminClient();
    const { data: tours } = await supabase
      .from("tours")
      .select("slug, updated_at")
      .eq("status", "published");
    tourPages = (tours ?? []).map((t) => ({
      url: `${BASE_URL}/t/${t.slug}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
  } catch {
    // If Supabase isn't reachable at build time, fall back to the demo only.
    tourPages = [
      {
        url: `${BASE_URL}/t/kremmen-place`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.85,
      },
    ];
  }

  return [...staticPages, ...guideArticles, ...tourPages];
}
