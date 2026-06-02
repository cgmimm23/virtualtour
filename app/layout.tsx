import type { Metadata } from "next";
import "./globals.css";

// Set metadataBase so relative OG / Twitter image URLs resolve to the
// production origin instead of localhost:8080 — Next prints a warning at
// runtime when this is missing, and worse, the fallback URL leaks into
// shared previews on social platforms.
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "VITA · by CGMIMM",
  description:
    "VITA — Virtual Interactive Tour Application. AI-powered 360° tours for real estate, by CGMIMM.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
