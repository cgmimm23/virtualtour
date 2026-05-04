import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <DemoBlock />
      <PricingTeaser />
      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900" />
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-200/40 via-transparent to-transparent dark:from-amber-500/10" />
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 px-3 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Built for solo agents and small teams
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            The <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">AI virtual tour creator</span> built for real estate
          </h1>
          <p className="mt-5 text-lg text-neutral-600 dark:text-neutral-400 md:text-xl">
            Upload 360 photos from any camera. AI auto-names every room and links the
            doorways. Branded, lead-capturing tours ready in minutes — every email pipes
            straight into your CRM.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/t/kremmen-place?view=1"
              className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              See a live tour →
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-5 py-3 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              View pricing
            </Link>
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            14-day free trial · No card required · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800 py-8">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Camera-agnostic — works with what you already own
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium text-neutral-400 dark:text-neutral-500">
          <span>Insta360 X3 / X4 / One X2</span>
          <span>·</span>
          <span>Ricoh Theta Z1 / X / SC2</span>
          <span>·</span>
          <span>Labpano Pilot</span>
          <span>·</span>
          <span>iPhone Pano</span>
          <span>·</span>
          <span>GoPro Max</span>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      title: "Lead capture is the product",
      body: "Email gate before viewers see the kitchen. Contact buttons in every scene. Captured leads pipe straight to Follow Up Boss, kvCORE, Sierra — or any CRM via Zapier.",
      icon: <IconLead />,
    },
    {
      title: "Any camera, any photo",
      body: "Upload equirect JPGs from any 360 camera. We handle tiling, compression, and CDN delivery so your tour loads in under 1.5s on mobile.",
      icon: <IconCamera />,
    },
    {
      title: "Publish in 10 minutes",
      body: "Drop photos. Name rooms. Drag doorway hotspots. Hit publish. Most competitors need 30+ minutes. We're built for the agent who just took the listing this morning.",
      icon: <IconClock />,
    },
    {
      title: "Branded for you, not us",
      body: "Your name, your photo, your colors, your domain. The Brokerage tier removes our footer entirely. No more 'Powered by Acme Tours' on your high-end listings.",
      icon: <IconBrand />,
    },
    {
      title: "Mobile-first viewer",
      body: "Buyers tour on their phones. Drag, pinch, gyro look-around — all dialed in. Works on every iOS and Android browser, no app to install.",
      icon: <IconPhone />,
    },
    {
      title: "Analytics agents actually use",
      body: "Which scene held attention longest. Where viewers dropped off. Conversion from view to lead, per tour. Pricing data your sellers will love seeing.",
      icon: <IconChart />,
    },
  ];
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Everything you need. Nothing you don't.
          </h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            We don't sell hardware. We don't lock you in. We win when your tours close deals.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                {it.icon}
              </div>
              <h3 className="font-semibold">{it.title}</h3>
              <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: "Shoot",
      body: "Walk the property with any 360 camera. Tap the shutter in each room. ~8 minutes for a typical 4-bed house.",
    },
    {
      n: 2,
      title: "Upload & link",
      body: "Drop the equirect JPGs in. Name each room. Drag doorway arrows between scenes. Add a contact button.",
    },
    {
      n: 3,
      title: "Share",
      body: "Hit publish. Send the URL to MLS, paste into Zillow, embed on your site. Leads land in your inbox.",
    },
  ];
  return (
    <section id="how-it-works" className="border-y border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
            How it works
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Three steps. About 10 minutes.
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoBlock() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-neutral-900 dark:to-black p-1 shadow-2xl">
          <div className="relative aspect-video overflow-hidden rounded-[20px] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tours/kremmen-place/scene-01.jpg"
              alt="Kremmen Place exterior"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Live demo · 29 scenes
              </span>
              <h3 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
                Kremmen Place
              </h3>
              <p className="mt-1 max-w-md text-sm text-white/70">
                Real listing, real photos. Drag to look around. Click doorways to walk through.
                Try the lead gate after 3 scenes.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/t/kremmen-place?view=1"
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-lg hover:bg-neutral-200"
                >
                  Open the live tour →
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Try the editor →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="border-y border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
            Pricing
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Pays for itself with one closed lead.
          </h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Solo plan covers 5 active tours and includes lead capture. Annual billing saves
            you 2 months. Cancel anytime.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <PriceCard tier="Solo" price={29} highlight={false} blurb="For the solo agent shipping 5 tours/mo." />
          <PriceCard tier="Team" price={79} highlight blurb="For small teams (5 users) and CRM piping." />
          <PriceCard tier="Brokerage" price={199} highlight={false} blurb="White-label, custom domain, API access." />
        </div>
        <div className="mt-8 text-center">
          <Link href="/pricing" className="text-sm font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300">
            See full feature comparison →
          </Link>
        </div>
      </div>
    </section>
  );
}

function PriceCard({ tier, price, highlight, blurb }: { tier: string; price: number; highlight: boolean; blurb: string }) {
  return (
    <div className={`rounded-2xl border p-6 ${highlight ? "border-neutral-900 bg-neutral-900 text-white shadow-xl dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"}`}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{tier}</h3>
        {highlight ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${highlight ? "bg-amber-400 text-neutral-900" : ""}`}>
            Most popular
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <span className="text-4xl font-bold">${price}</span>
        <span className={`text-sm ${highlight ? "text-white/60 dark:text-neutral-500" : "text-neutral-500"}`}>/mo</span>
      </div>
      <p className={`mt-2 text-sm ${highlight ? "text-white/70 dark:text-neutral-600" : "text-neutral-600 dark:text-neutral-400"}`}>{blurb}</p>
    </div>
  );
}

function FinalCta() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          AI-powered tours, ready in minutes.
        </h2>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          Tourly works with the camera in your kit bag. Captures leads. Costs less than one
          listing flyer. Try it on your next listing — 14-day free trial, no card required.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/t/kremmen-place?view=1"
            className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            See it in action →
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
          >
            Compare plans
          </Link>
        </div>
      </div>
    </section>
  );
}

const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IconLead() {
  return (
    <svg {...iconProps}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg {...iconProps}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconBrand() {
  return (
    <svg {...iconProps}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg {...iconProps}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
