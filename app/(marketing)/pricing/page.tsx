import Link from "next/link";

const TIERS = [
  {
    name: "Solo",
    price: 29,
    blurb: "For the solo agent shipping a few tours a month.",
    cta: "Start free trial",
    highlight: false,
    features: [
      { label: "5 active tours", included: true },
      { label: "1 user", included: true },
      { label: "25 GB storage", included: true },
      { label: "Unlimited tour views", included: true },
      { label: "Email lead capture", included: true },
      { label: "CSV export", included: true },
      { label: "Zapier integration", included: true },
      { label: "Native CRM (FUB, kvCORE, Sierra)", included: false },
      { label: "White-label / custom domain", included: false },
      { label: "API access", included: false },
    ],
  },
  {
    name: "Team",
    price: 79,
    blurb: "For small teams that pipe leads to a CRM.",
    cta: "Start free trial",
    highlight: true,
    features: [
      { label: "25 active tours", included: true },
      { label: "5 users", included: true },
      { label: "100 GB storage", included: true },
      { label: "Unlimited tour views", included: true },
      { label: "Email lead capture", included: true },
      { label: "CSV export", included: true },
      { label: "Zapier integration", included: true },
      { label: "Native CRM (FUB, kvCORE, Sierra)", included: true },
      { label: "Custom branding + colors", included: true },
      { label: "White-label / custom domain", included: false },
      { label: "API access", included: false },
    ],
  },
  {
    name: "Brokerage",
    price: 199,
    blurb: "For brokerages with custom domains and integrations.",
    cta: "Contact sales",
    highlight: false,
    features: [
      { label: "Unlimited active tours", included: true },
      { label: "20 users", included: true },
      { label: "500 GB storage", included: true },
      { label: "Unlimited tour views", included: true },
      { label: "Email lead capture", included: true },
      { label: "CSV export", included: true },
      { label: "Zapier integration", included: true },
      { label: "Native CRM (FUB, kvCORE, Sierra)", included: true },
      { label: "Custom branding + colors", included: true },
      { label: 'Remove "Powered by Tourly"', included: true },
      { label: "Custom domain (CNAME)", included: true },
      { label: "API access", included: true },
    ],
  },
];

const FAQS = [
  {
    q: "What 360 cameras do you support?",
    a: "Anything that exports a 2:1 equirectangular JPG. We test on Insta360 X3/X4/One X2, Ricoh Theta Z1/X/SC2, Labpano Pilot, and GoPro Max. iPhone panorama mode also works for outdoor shots, though dedicated 360 cameras are sharper.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. The 14-day free trial is fully featured — you only need a card if you want to publish your first paid tour. We'll email a reminder before the trial ends.",
  },
  {
    q: "What's the difference between active and archived tours?",
    a: "Active tours are publicly viewable at their share URL. Archived tours are kept in your dashboard but return 404 to the public. You can re-activate anytime. Closed listings are usually archived.",
  },
  {
    q: "Where do my leads go?",
    a: "Every email submission triggers an instant notification to you, lands in your Tourly dashboard, and pushes to whatever CRM you've connected. CSV export is one click.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No annual contracts (annual billing is just a discount, not a commitment). On cancellation your tours stay live until the end of the billing period, then archive automatically — you can export everything before that.",
  },
  {
    q: "Do you white-label?",
    a: "On the Brokerage plan we remove the Tourly footer entirely and let you point a custom domain at your tours (e.g. tours.yourbrokerage.com). Solo and Team include agent branding but keep the Tourly footer.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-neutral-200 dark:border-neutral-800 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
            Pricing
          </span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Simple plans. Real margins.
          </h1>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            14-day free trial on every plan. Annual billing saves you 2 months.
            No setup fees. No hardware to buy.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`relative flex flex-col rounded-2xl border p-6 md:p-8 ${
                  t.highlight
                    ? "border-amber-400 shadow-2xl ring-1 ring-amber-400/30"
                    : "border-neutral-200 dark:border-neutral-800"
                } bg-white dark:bg-neutral-950`}
              >
                {t.highlight ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-900">
                    Most popular
                  </span>
                ) : null}
                <h2 className="text-xl font-semibold">{t.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">{t.blurb}</p>
                <div className="mt-6">
                  <span className="text-5xl font-bold tracking-tight">${t.price}</span>
                  <span className="text-sm text-neutral-500">/mo</span>
                </div>
                <Link
                  href="/signup"
                  className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
                    t.highlight
                      ? "bg-amber-400 text-neutral-900 hover:bg-amber-300"
                      : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                  }`}
                >
                  {t.cta}
                </Link>
                <ul className="mt-8 flex-1 space-y-2.5 text-sm">
                  {t.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2">
                      {f.included ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-emerald-500">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-neutral-300 dark:text-neutral-700">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                      <span className={f.included ? "" : "text-neutral-400 line-through dark:text-neutral-600"}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-neutral-500">
            Prices in USD. Annual billing available at checkout (save ~17%).
          </p>
        </div>
      </section>

      <section className="border-y border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
            Frequently asked
          </h2>
          <div className="mt-10 space-y-6">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5">
                <summary className="flex cursor-pointer items-center justify-between font-semibold list-none">
                  {f.q}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-neutral-400 transition-transform group-open:rotate-45">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Try it on a real listing.
          </h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            14 days free. No card. Bring any 360 camera and a property you're already listing.
          </p>
          <Link
            href="/t/kremmen-place?view=1"
            className="mt-7 inline-block rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            See the demo first →
          </Link>
        </div>
      </section>
    </>
  );
}
