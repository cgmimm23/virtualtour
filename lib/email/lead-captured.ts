// "You got a lead" email to the agent. Fired from submitPublicLead after the
// insert succeeds. We look up the tour → team → owners directly via Prisma
// (the caller is anonymous; this lookup is intentionally cross-tenant since we
// resolve the tour's owning team from the public tour slug).

import "server-only";
import { prisma } from "@/lib/db";
import { sendEmail, esc } from "./client";

interface NotifyParams {
  leadId: string;
  tourSlug: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  preferredTime?: string | null;
  source: string;
  scenesViewed: number;
  durationMs: number;
}

export async function notifyAgentOfLead(params: NotifyParams): Promise<void> {
  // Resolve tour → team → owner emails. Cross-tenant by design: the public
  // tour slug determines which team owns the lead.
  const tour = await prisma.tours.findUnique({
    where: { slug: params.tourSlug },
    select: { id: true, title: true, slug: true, property_address: true, team_id: true },
  });
  if (!tour) return;

  const members = await prisma.team_members.findMany({
    where: { team_id: tour.team_id, role: { in: ["owner", "admin"] } },
    select: { users: { select: { email: true } } },
  });
  if (members.length === 0) return;

  const recipients: string[] = [];
  for (const m of members) {
    if (m.users?.email) recipients.push(m.users.email);
  }
  if (recipients.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";
  const tourUrl = `${appUrl}/t/${tour.slug}`;
  const dashUrl = `${appUrl}/dashboard/leads`;
  const minutes = Math.round(params.durationMs / 60000);
  const seconds = Math.round((params.durationMs % 60000) / 1000);
  const duration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  await sendEmail({
    to: recipients,
    replyTo: params.email,
    subject: `New lead on ${tour.title}: ${params.name?.trim() || params.email}`,
    text: textBody({ ...params, tour, tourUrl, dashUrl, duration }),
    html: htmlBody({ ...params, tour, tourUrl, dashUrl, duration }),
    tags: [
      { name: "type", value: "lead_captured" },
      { name: "tour_slug", value: tour.slug },
      { name: "lead_source", value: params.source },
    ],
  });
}

interface BodyCtx extends NotifyParams {
  tour: { title: string; slug: string; property_address: string | null };
  tourUrl: string;
  dashUrl: string;
  duration: string;
}

function textBody(c: BodyCtx): string {
  const lines: string[] = [];
  lines.push(`New lead on ${c.tour.title}`);
  if (c.tour.property_address) lines.push(c.tour.property_address);
  lines.push("");
  lines.push(`Name:     ${c.name ?? "—"}`);
  lines.push(`Email:    ${c.email}`);
  if (c.phone) lines.push(`Phone:    ${c.phone}`);
  if (c.preferredTime) lines.push(`Wants:    ${c.preferredTime}`);
  lines.push("");
  lines.push(`Source:   ${c.source}`);
  lines.push(`Engaged:  ${c.scenesViewed} scene${c.scenesViewed === 1 ? "" : "s"} · ${c.duration}`);
  lines.push("");
  lines.push(`Reply directly to this email and it'll go to ${c.email}.`);
  lines.push("");
  lines.push(`Tour:     ${c.tourUrl}`);
  lines.push(`Leads:    ${c.dashUrl}`);
  return lines.join("\n");
}

function htmlBody(c: BodyCtx): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a0a0a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">
      <tr><td style="padding:24px 28px 8px;">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;font-weight:600;">New lead</div>
        <div style="margin-top:4px;font-size:22px;font-weight:700;line-height:1.2;">${esc(c.tour.title)}</div>
        ${c.tour.property_address ? `<div style="margin-top:2px;color:#52525b;font-size:13px;">${esc(c.tour.property_address)}</div>` : ""}
      </td></tr>
      <tr><td style="padding:8px 28px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
          ${row("Name", esc(c.name ?? "—"))}
          ${row("Email", `<a href="mailto:${esc(c.email)}" style="color:#1f6feb;text-decoration:none;">${esc(c.email)}</a>`)}
          ${c.phone ? row("Phone", esc(c.phone)) : ""}
          ${c.preferredTime ? row("Wants", esc(c.preferredTime)) : ""}
          ${row("Source", esc(c.source))}
          ${row("Engaged", `${c.scenesViewed} scene${c.scenesViewed === 1 ? "" : "s"} · ${esc(c.duration)}`)}
        </table>
      </td></tr>
      <tr><td style="padding:12px 28px 24px;">
        <a href="${esc(c.tourUrl)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;font-weight:600;font-size:13px;padding:10px 16px;border-radius:8px;text-decoration:none;margin-right:8px;">View tour</a>
        <a href="${esc(c.dashUrl)}" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-weight:600;font-size:13px;padding:9px 16px;border:1px solid #e5e7eb;border-radius:8px;text-decoration:none;">Open dashboard</a>
        <div style="margin-top:14px;font-size:12px;color:#71717a;">Hit reply to email the lead directly.</div>
      </td></tr>
    </table>
    <div style="margin-top:14px;font-size:11px;color:#a1a1aa;">Sent by VITA · <a href="${esc(process.env.NEXT_PUBLIC_APP_URL ?? "")}" style="color:#a1a1aa;">virtualtour.cgmimm.com</a></div>
  </td></tr>
</table>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;width:96px;color:#71717a;font-size:13px;vertical-align:top;">${esc(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:14px;color:#0a0a0a;">${value}</td>
  </tr>`;
}
