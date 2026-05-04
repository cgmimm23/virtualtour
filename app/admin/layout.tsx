import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";

export const metadata = {
  title: "VITA admin",
  robots: { index: false, follow: false },
};

const NAV: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/tours", label: "Tours" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Gate the entire /admin/* tree at the layout level. Anyone non-admin gets
  // a 404; layout doesn't even render the chrome.
  const user = await requirePlatformAdmin("/admin");

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <Logo compact />
              <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Admin
              </span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-neutral-600 hover:text-brand-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="hidden sm:inline">{user.email}</span>
            <Link
              href="/dashboard"
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-100"
            >
              Customer view →
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
