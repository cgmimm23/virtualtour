import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tourly",
  description: "Interactive 360° virtual tours for real estate agents.",
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
