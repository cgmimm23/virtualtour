"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveTeam } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkTourQuota } from "@/lib/plan-limits";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base || "tour";
  // Tours.slug is globally unique. Try a few suffixes before falling back to
  // a timestamp tail. The unique constraint at insert is the real guard; this
  // peek (across all tours, not team-scoped on purpose — slug is global) just
  // reduces collisions in the common case.
  for (let i = 0; i < 5; i++) {
    const trial = i === 0 ? candidate : `${candidate}-${i + 1}`;
    const data = await prisma.tours.findUnique({ where: { slug: trial }, select: { id: true } });
    if (!data) return trial;
    candidate = base;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createTourAction(formData: FormData): Promise<void> {
  const { team } = await requireActiveTeam();
  const quota = await checkTourQuota(team.id, team.plan);
  if (!quota.ok) {
    // Bounce back to dashboard with a query flag the page surfaces as a banner
    // + upgrade CTA. Throwing here would land on a 500 which is the wrong UX.
    redirect(`/dashboard?upgrade=tours&current=${quota.current}&limit=${quota.limit}&plan=${quota.plan}`);
  }

  const title = String(formData.get("title") ?? "").trim() || "Untitled tour";
  const address = String(formData.get("propertyAddress") ?? "").trim() || null;

  const slug = await uniqueSlug(slugify(title));

  const data = await prisma.tours.create({
    data: {
      team_id: team.id,
      slug,
      title,
      property_address: address,
      status: "draft",
    },
    select: { id: true },
  });

  if (!data) {
    throw new Error("Failed to create tour");
  }

  revalidatePath("/dashboard");
  redirect(`/editor/${data.id}`);
}
