import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "VITA · Virtual Interactive Tour Application by CGMIMM",
  description:
    "AI-powered 360° virtual tours for real estate. Camera-agnostic, lead-capturing, ready in minutes. Built by CGMIMM.",
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
            className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            Get started →
          </Link>
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
            AI-powered 360° virtual tours for real estate agents. Camera-agnostic,
            lead-capture-first, ready in minutes.
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
            <li><Link href="/t/kremmen-place?view=1" className="hover:text-neutral-900 dark:hover:text-neutral-100">Live demo</Link></li>
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
