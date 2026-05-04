// Hardcoded demo tour. Used as the public/landing-demo fallback when Supabase
// isn't configured (or when migrations haven't been seeded with this tour
// yet). Real tours come from the database via fetchPublicTourBySlug.

import type { Tour } from "./types";

const SCENE_COUNT = 29;

const scenes = Array.from({ length: SCENE_COUNT }, (_, i) => {
  const n = i + 1;
  const padded = String(n).padStart(2, "0");
  return {
    id: `scene-${padded}`,
    name: `Scene ${padded}`,
    imageUrl: `/tours/kremmen-place/scene-${padded}.jpg`,
    initialYaw: 0,
    initialPitch: 0,
    initialFov: (Math.PI * 100) / 180,
    hotspots: [],
  };
});

export const kremmenPlaceTour: Tour = {
  id: "kremmen-place",
  slug: "kremmen-place",
  title: "Kremmen Place",
  propertyAddress: "Kremmen Place",
  scenes,
  coverSceneId: "scene-01",
  branding: {
    agentName: "Jonathan",
    agentEmail: "jonathan@cgmimm.com",
    primaryColor: "#205081",
  },
  leadGate: {
    enabled: true,
    triggerScenes: 3,
    triggerMs: 60_000,
    headline: "Like what you see?",
    subhead: "Leave your email for full access and updates on similar listings.",
    ctaLabel: "Continue tour",
    collectName: true,
    collectPhone: false,
  },
};
