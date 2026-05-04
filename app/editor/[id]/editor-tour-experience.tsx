"use client";

// Authed editor wrapper. Wires the TourExperience component up to its
// Supabase-backed save / load callbacks so /editor/[id] can stay a thin
// server component.

import { useCallback } from "react";
import { TourExperience } from "@/components/tour-editor/tour-experience";
import { saveTour } from "@/lib/tour/actions";
import { listLeadsForTour } from "@/lib/tour/lead-actions";
import type { Tour } from "@/lib/tour/types";

interface EditorTourExperienceProps {
  tour: Tour;
  tourId: string;
}

export function EditorTourExperience({ tour, tourId }: EditorTourExperienceProps) {
  const onSaveTour = useCallback(
    async (next: Tour) => {
      const result = await saveTour(next);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    },
    [],
  );

  const onLoadLeads = useCallback(() => listLeadsForTour(tourId), [tourId]);

  return (
    <TourExperience
      baseTour={tour}
      canEdit
      onSaveTour={onSaveTour}
      onLoadLeads={onLoadLeads}
    />
  );
}
