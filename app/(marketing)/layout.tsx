import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { MobileNav } from "@/components/marketing/mobile-nav";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com",
  ),
  title: {
    default: "VITA · AI Virtual Tour Creator for Real Estate",
    template: "%s · VITA by CGMIMM",
  },
  description:
    "AI-powered 360° virtual tours for real estate agents. Upload from any camera; auto-name rooms; capture buyer leads. Free 14-day trial.",
  keywords: [
    "virtual tour",
    "real estate virtual tour",
    "AI virtual tour",
    "360 virtual tour",
    "real estate marketing",
    "lead capture",
    "Matterport alternative",
    "virtual tour software",
  ],
  applicationName: "VITA",
  authors: [{ name: "CGMIMM", url: "https://www.cgmimm.com" }],
  creator: "CGMIMM",
  openGraph: {
    type: "website",
    siteName: "VITA by CGMIMM",
    title: "VITA · AI Virtual Tour Creator for Real Estate",
    description:
      "AI-powered 360° virtual tours for real estate. Camera-agnostic, lead-capturing, ready in minutes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VITA · AI Virtual Tour Creator",
    description:
      "AI-powered 360° virtual tours for real estate. Free 14-day trial.",
  },
  robots: { index: true, follow: true },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/#how-it-works" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
            How it works
          </Link>
          <Link href="/#features" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
            Features
          </Link>
          <Link href="/pricing" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
            Pricing
          </Link>
          <Link href="/guide" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
            Guide
          </Link>
          <Link href="/t/kremmen-place?view=1" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
            Live demo
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 md:inline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="hidden rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 md:inline"
          >
            Get started →
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 py-10">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 text-sm md:grid-cols-4">
        <div className="col-span-2">
          <Link href="/">
            <Logo />
          </Link>
          <p className="mt-3 max-w-xs text-neutral-500">
            AI-powered 360°{" "}
            <Link href="/t/kremmen-place?view=1" className="text-brand-600 hover:underline">
              virtual tours
            </Link>{" "}
            for real estate agents. Camera-agnostic, lead-capture-first, ready in
            minutes.
          </p>
          <p className="mt-4 text-xs text-neutral-400">
            © {new Date().getFullYear()} VITA · CGMIMM. All rights reserved.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Product</h4>
          <ul className="mt-2 space-y-2 text-neutral-600 dark:text-neutral-400">
            <li><Link href="/#features" className="hover:text-neutral-900 dark:hover:text-neutral-100">Features</Link></li>
            <li><Link href="/pricing" className="hover:text-neutral-900 dark:hover:text-neutral-100">Pricing</Link></li>
            <li><Link href="/guide" className="hover:text-neutral-900 dark:hover:text-neutral-100">Guide</Link></li>
            <li><Link href="/t/kremmen-place?view=1" className="hover:text-neutral-900 dark:hover:text-neutral-100">Sample virtual tour</Link></li>
            <li><Link href="/guide" className="hover:text-neutral-900 dark:hover:text-neutral-100">Virtual tour guide</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Company</h4>
          <ul className="mt-2 space-y-2 text-neutral-600 dark:text-neutral-400">
            <li><Link href="#" className="hover:text-neutral-900 dark:hover:text-neutral-100">About</Link></li>
            <li><Link href="#" className="hover:text-neutral-900 dark:hover:text-neutral-100">Privacy</Link></li>
            <li><Link href="#" className="hover:text-neutral-900 dark:hover:text-neutral-100">Terms</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
