import type { ComponentType } from "react";
import { ARTICLES_META, type ArticleMetaLite } from "./meta";
import { Article as VirtualTours101 } from "./virtual-tours-101";
import { Article as ChoosingACamera } from "./choosing-a-camera";
import { Article as ShootingA360Photo } from "./shooting-a-360-photo";
import { Article as ExportingEquirectangular } from "./exporting-equirectangular";
import { Article as PlanningATour } from "./planning-a-tour";
import { Article as UploadingYourPhotos } from "./uploading-your-photos";
import { Article as HotspotsExplained } from "./hotspots-explained";
import { Article as SettingTheOpeningView } from "./setting-the-opening-view";
import { Article as BrandingYourTour } from "./branding-your-tour";
import { Article as LeadCapture } from "./lead-capture";
import { Article as SharingAndEmbedding } from "./sharing-and-embedding";
import { Article as AnalyticsAndTroubleshooting } from "./analytics-and-troubleshooting";

export type ArticleMeta = ArticleMetaLite & { Article: ComponentType };

const COMPONENTS: Record<string, ComponentType> = {
  "virtual-tours-101": VirtualTours101,
  "choosing-a-camera": ChoosingACamera,
  "shooting-a-360-photo": ShootingA360Photo,
  "exporting-equirectangular": ExportingEquirectangular,
  "planning-a-tour": PlanningATour,
  "uploading-your-photos": UploadingYourPhotos,
  "hotspots-explained": HotspotsExplained,
  "setting-the-opening-view": SettingTheOpeningView,
  "branding-your-tour": BrandingYourTour,
  "lead-capture": LeadCapture,
  "sharing-and-embedding": SharingAndEmbedding,
  "analytics-and-troubleshooting": AnalyticsAndTroubleshooting,
};

export const ARTICLES: ArticleMeta[] = ARTICLES_META.map((m) => ({
  ...m,
  Article: COMPONENTS[m.slug],
}));

export { SECTION_ORDER, SECTION_BLURB } from "./meta";

export function getArticle(slug: string): ArticleMeta | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getArticleNeighbors(slug: string): {
  prev: ArticleMeta | null;
  next: ArticleMeta | null;
} {
  const i = ARTICLES.findIndex((a) => a.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? ARTICLES[i - 1] : null,
    next: i < ARTICLES.length - 1 ? ARTICLES[i + 1] : null,
  };
}
