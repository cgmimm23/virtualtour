"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireActiveTeam } from "@/lib/auth";
import { authorizeTourAccess } from "./access";
import { notifyAgentOfLead } from "@/lib/email/lead-captured";
import type { Lead } from "./types";
import type { LeadSource } from "@/types/supabase";

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

  // SECURITY DEFINER RPC: validates the slug + status before inserting. We
  // call it via raw SQL since the Postgres function still exists. Casts mirror
  // the function's arg types (timestamptz, lead_source enum).
  let leadId: string;
  try {
    const rows = await prisma.$queryRawUnsafe<{ submit_public_lead: string }[]>(
      `select submit_public_lead($1, $2, $3, $4, $5::timestamptz, $6::lead_source, $7, $8) as submit_public_lead`,
      input.tourSlug,
      input.email.trim(),
      input.name?.trim() || null,
      input.phone?.trim() || null,
      input.preferredTime || null,
      input.source,
      input.scenesViewed,
      input.durationMs,
    );
    const id = rows[0]?.submit_public_lead;
    if (!id) return { ok: false, error: "Lead submission failed." };
    leadId = id;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lead submission failed." };
  }

  // Fire the agent notification email out-of-band — we don't want a Resend
  // hiccup to fail the lead submission. notifyAgentOfLead swallows its own
  // errors but we still try/catch for paranoia.
  try {
    await notifyAgentOfLead({
      leadId,
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

  return { ok: true, id: leadId };
}

// listLeadsForTour --------------------------------------------------------
//
// Authed. No RLS anymore — authorizeTourAccess explicitly confirms the caller
// is a platform admin or a member of the tour's own team before we read leads.

export async function listLeadsForTour(tourId: string): Promise<Lead[]> {
  const access = await authorizeTourAccess(tourId);
  if (!access.ok) {
    if (access.status === 404) return [];
    throw new Error(access.error);
  }

  const tour = await prisma.tours.findUnique({
    where: { id: tourId },
    select: { id: true, slug: true },
  });
  if (!tour) return [];

  const data = await prisma.leads.findMany({
    where: { tour_id: tourId },
    orderBy: { captured_at: "desc" },
  });

  return data.map((row) => rowToLead(row as unknown as LeadRow, tour.slug));
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

  // Scope tours to the caller's team, then pull leads only for those tours.
  const tours = await prisma.tours.findMany({
    where: { team_id: team.id },
    select: { id: true, slug: true, title: true },
  });
  const tourMap = new Map(tours.map((t) => [t.id, t]));
  const tourIds = Array.from(tourMap.keys());
  if (tourIds.length === 0) return [];

  const leads = await prisma.leads.findMany({
    where: { tour_id: { in: tourIds } },
    orderBy: { captured_at: "desc" },
  });

  return leads.map((row) => {
    const tour = tourMap.get(row.tour_id);
    const lead = rowToLead(row as unknown as LeadRow, tour?.slug ?? "");
    return { ...lead, tourTitle: tour?.title ?? "(unknown)", tourId: row.tour_id };
  });
}

// deleteAllLeadsForTour --------------------------------------------------

export async function deleteAllLeadsForTour(tourId: string): Promise<void> {
  // No RLS — must confirm the caller owns this tour before bulk-deleting its
  // leads. authorizeTourAccess passes platform admins and same-team members.
  const access = await authorizeTourAccess(tourId);
  if (!access.ok) throw new Error(access.error);
  await prisma.leads.deleteMany({ where: { tour_id: tourId } });
  revalidatePath("/dashboard/leads");
}

// Prisma returns Date objects for timestamptz columns; the Lead type uses ISO
// strings, so we normalize at the boundary.
interface LeadRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  preferred_time: Date | string | null;
  source: string;
  captured_at: Date | string;
  scenes_viewed: number;
  duration_ms: number;
}

function toIso(v: Date | string | null | undefined): string | undefined {
  if (v == null) return undefined;
  return v instanceof Date ? v.toISOString() : v;
}

function rowToLead(row: LeadRow, tourSlug: string): Lead {
  return {
    id: row.id,
    tourSlug,
    email: row.email,
    name: row.name ?? undefined,
    phone: row.phone ?? undefined,
    preferredTime: toIso(row.preferred_time),
    source: row.source as Lead["source"],
    capturedAt: toIso(row.captured_at) ?? "",
    scenesViewed: row.scenes_viewed,
    durationMs: row.duration_ms,
  };
}
