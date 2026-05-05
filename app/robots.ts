import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/t/", "/guide/", "/pricing", "/signup", "/login"],
        disallow: [
          "/admin",
          "/admin/",
          "/dashboard",
          "/dashboard/",
          "/editor",
          "/editor/",
          "/api/",
          "/auth/",
          "/_next/",
          // Embed and kiosk are app modes, not unique pages — block them
          // from being indexed as duplicates of the share view.
          "/*?embed=1",
          "/*?kiosk=1",
          "/*?preview=1",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
