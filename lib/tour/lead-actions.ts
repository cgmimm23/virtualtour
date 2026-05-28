"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveTeam } from "@/lib/auth";
import { notifyAgentOfLead } from "@/lib/email/lead-captured";
import type { Lead } from "./types";
import type { LeadSource, Database } from "@/types/supabase";

// submitPublicLead --------------------------------------------------------
//
// Called from the public tour viewer. Goes through the SECURITY DEFINER RPC
// which validates the slug + status before inserting. We use the admin
// client here only because the public viewer may not have a session cookie;
// the RPC itself does the authorization.

interface SubmitLeadInput {
  tourSlug: string;
  email: string;
  name?: string;
  phone?: string;
  preferredTime?: string;
  source: LeadSource;
  scenesViewed: number;
  durationMs: number;
}

export async function submitPublicLead(
  input: SubmitLeadInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.email || !input.email.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("submit_public_lead", {
    p_tour_slug: input.tourSlug,
    p_email: input.email.trim(),
    p_name: input.name?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_preferred_time: input.preferredTime || null,
    p_source: input.source,
    p_scenes_viewed: input.scenesViewed,
    p_duration_ms: input.durationMs,
  });

  if (error) return { ok: false, error: error.message };

  // Fire the agent notification email out-of-band — we don't want a Resend
  // hiccup to fail the lead submission. notifyAgentOfLead swallows its own
  // errors but we still try/catch for paranoia.
  try {
    await notifyAgentOfLead({
      leadId: data as unknown as string,
      tourSlug: input.tourSlug,
      email: input.email.trim(),
      name: input.name?.trim() ?? null,
      phone: input.phone?.trim() ?? null,
      preferredTime: input.preferredTime ?? null,
      source: input.source,
      scenesViewed: input.scenesViewed,
      durationMs: input.durationMs,
    });
  } catch (err) {
    console.error("[submitPublicLead] notify failed:", err);
  }

  return { ok: true, id: data as unknown as string };
}

// listLeadsForTour --------------------------------------------------------
//
// Authed. RLS scopes leads to the caller's team via the tour relation.

export async function listLeadsForTour(tourId: string): Promise<Lead[]> {
  await requireActiveTeam();
  const supabase = await createClient();
  const { data: tour } = await supabase
    .from("tours")
    .select("id, slug")
    .eq("id", tourId)
    .maybeSingle();
  if (!tour) return [];

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("tour_id", tourId)
    .order("captured_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToLead(row, tour.slug));
}

// listLeadsForTeam --------------------------------------------------------
//
// Used by /dashboard/leads. Joins through tours so we can show which tour
// each lead came from.

export interface LeadWithTour extends Lead {
  tourTitle: string;
  tourId: string;
}

export async function listLeadsForTeam(): Promise<LeadWithTour[]> {
  const { team } = await requireActiveTeam();
  const supabase = await createClient();

  // Two queries because PostgREST nested selects don't compose cleanly with
  // ordering across the join in our shape.
  const { data: tours } = await supabase
    .from("tours")
    .select("id, slug, title")
    .eq("team_id", team.id);
  const tourMap = new Map((tours ?? []).map((t) => [t.id, t]));
  const tourIds = Array.from(tourMap.keys());
  if (tourIds.length === 0) return [];

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .in("tour_id", tourIds)
    .order("captured_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (leads ?? []).map((row) => {
    const tour = tourMap.get(row.tour_id);
    const lead = rowToLead(row, tour?.slug ?? "");
    return { ...lead, tourTitle: tour?.title ?? "(unknown)", tourId: row.tour_id };
  });
}

// deleteAllLeadsForTour --------------------------------------------------

export async function deleteAllLeadsForTour(tourId: string): Promise<void> {
  await requireActiveTeam();
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("tour_id", tourId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/leads");
}

function rowToLead(row: Database["public"]["Tables"]["leads"]["Row"], tourSlug: string): Lead {
  return {
    id: row.id,
    tourSlug,
    email: row.email,
    name: row.name ?? undefined,
    phone: row.phone ?? undefined,
    preferredTime: row.preferred_time ?? undefined,
    source: row.source as Lead["source"],
    capturedAt: row.captured_at,
    scenesViewed: row.scenes_viewed,
    durationMs: row.duration_ms,
  };
}
