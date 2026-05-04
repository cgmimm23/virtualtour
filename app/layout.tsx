import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
