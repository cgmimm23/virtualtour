import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPublicTourBySlug } from "@/lib/tour/public";
import { resolveTourImageUrls } from "@/lib/r2/resolve";
import { PublicTourExperience } from "@/components/tour-editor/public-tour-experience";
import type { Tour } from "@/lib/tour/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const raw = await fetchPublicTourBySlug(slug);
  if (!raw) return {};
  const tour = await resolveTourImageUrls(raw);
  const cover = tour.scenes.find((s) => s.id === tour.coverSceneId) ?? tour.scenes[0];
  const desc = describe(tour);
  return {
    title: `${tour.title} — ${tour.propertyAddress || "Virtual tour"}`,
    description: desc,
    openGraph: {
      title: tour.title,
      description: desc,
      type: "website",
      images: cover ? [{ url: cover.imageUrl, alt: tour.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: tour.title,
      description: desc,
      images: cover ? [cover.imageUrl] : [],
    },
  };
}

export default async function TourPage({ params }: PageProps) {
  const { slug } = await params;
  const raw = await fetchPublicTourBySlug(slug);
  if (!raw) notFound();

  // Enforce per-tour expiration (advertised feature, schema column existed
  // but no surface ever checked it). Past the cutoff, return a branded
  // "listing closed" page instead of opening the viewer.
  if (raw.expiresAt) {
    const endMs = new Date(raw.expiresAt).getTime();
    if (!Number.isNaN(endMs) && endMs <= Date.now()) {
      return <ExpiredTour title={raw.title} address={raw.propertyAddress} />;
    }
  }

  const tour = await resolveTourImageUrls(raw);

  return (
    <>
      <script
        type="application/ld+json"
        // RealEstateListing JSON-LD lets Google show the listing as a rich result.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(tour)) }}
      />
      <Suspense
        fallback={
          <div className="tour-stage flex items-center justify-center text-white/60 text-sm">
            Loading…
          </div>
        }
      >
        <PublicTourExperience tour={tour} />
      </Suspense>
    </>
  );
}

function ExpiredTour({ title, address }: { title: string; address: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-16 text-center text-neutral-100">
      <div className="max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
            <path d="M12 6v6l4 2" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">This tour has closed</h1>
        <p className="mt-2 text-sm text-neutral-400">
          {title}
          {address ? ` · ${address}` : ""} is no longer publicly viewable. The
          listing agent may have a current property to share.
        </p>
      </div>
    </div>
  );
}

function describe(tour: Tour): string {
  const d = tour.details;
  const parts: string[] = [];
  if (tour.propertyAddress) parts.push(tour.propertyAddress);
  if (d?.beds !== undefined) parts.push(`${d.beds} bed`);
  if (d?.baths !== undefined) parts.push(`${d.baths} bath`);
  if (d?.sqft) parts.push(`${d.sqft.toLocaleString()} sqft`);
  if (d?.listPrice) parts.push(`Listed at $${d.listPrice.toLocaleString()}`);
  const stats = parts.join(" · ");
  return stats
    ? `Interactive 360° virtual tour. ${stats}.`
    : `Interactive 360° virtual tour of ${tour.title}.`;
}

function buildJsonLd(tour: Tour): Record<string, unknown> {
  const d = tour.details;
  const cover = tour.scenes.find((s) => s.id === tour.coverSceneId) ?? tour.scenes[0];
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: tour.title,
    description: describe(tour),
  };
  if (tour.propertyAddress) base.address = tour.propertyAddress;
  if (cover) base.image = cover.imageUrl;
  if (d?.listPrice) {
    base.offers = {
      "@type": "Offer",
      price: d.listPrice,
      priceCurrency: "USD",
      availability:
        d.status === "sold"
          ? "https://schema.org/SoldOut"
          : d.status === "pending"
            ? "https://schema.org/LimitedAvailability"
            : "https://schema.org/InStock",
    };
  }
  if (d?.beds !== undefined) base.numberOfBedrooms = d.beds;
  if (d?.baths !== undefined) base.numberOfBathroomsTotal = d.baths;
  if (d?.sqft) {
    base.floorSize = {
      "@type": "QuantitativeValue",
      value: d.sqft,
      unitCode: "FTK",
    };
  }
  if (d?.lotSqft) {
    base.lotSize = {
      "@type": "QuantitativeValue",
      value: d.lotSqft,
      unitCode: "FTK",
    };
  }
  if (d?.yearBuilt) base.yearBuilt = d.yearBuilt;
  if (d?.mlsNumber) base.identifier = d.mlsNumber;
  if (d?.propertyType) base.additionalType = d.propertyType;
  if (tour.branding?.agentName) {
    base.broker = {
      "@type": "RealEstateAgent",
      name: tour.branding.agentName,
      ...(tour.branding.brokerageName ? { affiliation: tour.branding.brokerageName } : {}),
      ...(tour.branding.agentEmail ? { email: tour.branding.agentEmail } : {}),
      ...(tour.branding.agentPhone ? { telephone: tour.branding.agentPhone } : {}),
    };
  }
  return base;
}
