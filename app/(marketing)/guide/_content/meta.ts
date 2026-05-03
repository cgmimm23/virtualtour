// Metadata-only export. Safe to import from client components.
// The actual Article TSX bodies live in registry.ts (server-only).

export type Section = "Foundations" | "Shooting" | "Building" | "Publishing";
export type EditorContext = "editor" | "hotspots" | "branding" | "leads" | "scenes" | "viewer";

export interface ArticleMetaLite {
  slug: string;
  title: string;
  description: string;
  section: Section;
  readMinutes: number;
  contexts?: EditorContext[];
}

export const SECTION_ORDER: Section[] = ["Foundations", "Shooting", "Building", "Publishing"];

export const SECTION_BLURB: Record<Section, string> = {
  Foundations: "What a virtual tour is, when it actually moves a deal, and what gear you need.",
  Shooting: "Capturing 360 photos that make a property look the way it did when buyers walked through.",
  Building: "Turning a folder of equirect photos into an interactive tour inside Tourly.",
  Publishing: "Distribution, lead capture, and knowing what's working.",
};

export const ARTICLES_META: ArticleMetaLite[] = [
  {
    slug: "virtual-tours-101",
    title: "Virtual tours 101: what they are and when to use one",
    description:
      "What a 360 virtual tour actually is, how it differs from video and floor plans, and the listing situations where it earns its keep.",
    section: "Foundations",
    readMinutes: 6,
  },
  {
    slug: "choosing-a-camera",
    title: "Choosing a 360 camera",
    description:
      "Insta360, Ricoh Theta, GoPro Max, iPhone — what's actually worth buying for real-estate tours, and what to skip.",
    section: "Foundations",
    readMinutes: 9,
  },
  {
    slug: "shooting-a-360-photo",
    title: "Shooting a 360 photo that doesn't look amateur",
    description:
      "Tripod height, lighting, hiding yourself, exposure, the things that separate a tour from a yard-sale flyer.",
    section: "Shooting",
    readMinutes: 10,
  },
  {
    slug: "exporting-equirectangular",
    title: "Exporting equirectangular images",
    description:
      "Getting a clean 2:1 equirectangular JPG out of Insta360, Theta, GoPro, and others. Includes the Insta360 Free Capture trap.",
    section: "Shooting",
    readMinutes: 7,
  },
  {
    slug: "planning-a-tour",
    title: "Planning a tour: shot list and room order",
    description:
      "How to walk a property efficiently, what to shoot in what order, and the rooms most agents forget.",
    section: "Shooting",
    readMinutes: 6,
  },
  {
    slug: "uploading-your-photos",
    title: "Uploading your photos to Tourly",
    description:
      "What happens between drag-and-drop and a viewable tour: tiling, processing states, and what to do if a scene gets stuck.",
    section: "Building",
    readMinutes: 5,
    contexts: ["editor", "scenes"],
  },
  {
    slug: "hotspots-explained",
    title: "Hotspots explained: scene links, info, URL, media",
    description:
      "Every hotspot type, what it's for, and the small UX rules that keep your tour from feeling like a 2010 panorama.",
    section: "Building",
    readMinutes: 9,
    contexts: ["editor", "hotspots"],
  },
  {
    slug: "setting-the-opening-view",
    title: "Setting the opening view of every scene",
    description:
      "Why initial yaw, pitch, and FOV matter more than people think — and how to set them in seconds inside the editor.",
    section: "Building",
    readMinutes: 5,
    contexts: ["editor", "scenes", "viewer"],
  },
  {
    slug: "branding-your-tour",
    title: "Branding your tour",
    description:
      "Agent card, logo, colors, contact CTA. How to make the tour feel like yours without making it feel busy.",
    section: "Building",
    readMinutes: 5,
    contexts: ["editor", "branding"],
  },
  {
    slug: "lead-capture",
    title: "Lead capture: gate, contact button, schedule a tour",
    description:
      "When to gate, when to defer, what fields to ask for, and the conversion psychology behind each choice.",
    section: "Publishing",
    readMinutes: 8,
    contexts: ["editor", "leads", "branding"],
  },
  {
    slug: "sharing-and-embedding",
    title: "Sharing and embedding your tour",
    description:
      "Where the URL goes — MLS, Zillow, your site, social, email signature, QR codes for open houses, and a clean iframe embed.",
    section: "Publishing",
    readMinutes: 6,
    contexts: ["viewer"],
  },
  {
    slug: "analytics-and-troubleshooting",
    title: "Analytics and troubleshooting",
    description:
      "Which numbers actually matter, what blurry tiles or missing scenes mean, and the fixes for the most common viewer problems.",
    section: "Publishing",
    readMinutes: 7,
    contexts: ["viewer", "editor"],
  },
];

export function getArticleMeta(slug: string): ArticleMetaLite | undefined {
  return ARTICLES_META.find((a) => a.slug === slug);
}

export function getNeighborsMeta(slug: string): {
  prev: ArticleMetaLite | null;
  next: ArticleMetaLite | null;
} {
  const i = ARTICLES_META.findIndex((a) => a.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? ARTICLES_META[i - 1] : null,
    next: i < ARTICLES_META.length - 1 ? ARTICLES_META[i + 1] : null,
  };
}

export function getArticlesMetaByContext(context: EditorContext): ArticleMetaLite[] {
  return ARTICLES_META.filter((a) => a.contexts?.includes(context));
}
