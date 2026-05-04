"use client";

// Public-tour client wrapper. Owns the `onSubmitLead` server-action call so
// /t/[slug] (a server component) can hand the submitted Tour to a single
// client island without serializing actions into props it doesn't need.

import { TourExperience, type PublicLeadInput } from "./tour-experience";
import { submitPublicLead } from "@/lib/tour/lead-actions";
import type { Tour } from "@/lib/tour/types";

interface PublicTourExperienceProps {
  tour: Tour;
}

export function PublicTourExperience({ tour }: PublicTourExperienceProps) {
  return (
    <TourExperience
      baseTour={tour}
      canEdit={false}
      onSubmitLead={async (input: PublicLeadInput) =>
        submitPublicLead({
          tourSlug: tour.slug,
          email: input.email,
          name: input.name,
          phone: input.phone,
          preferredTime: input.preferredTime,
          source: input.source,
          scenesViewed: input.scenesViewed,
          durationMs: input.durationMs,
        })
      }
    />
  );
}
