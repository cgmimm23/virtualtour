// "You've been invited to a VITA team" email. Sent by createTeamInvite
// when a team owner/admin adds a new email. Contains a one-tap accept
// link to /invite/<token>.

import "server-only";
import { sendEmail, esc } from "./client";

interface InviteParams {
  to: string;
  teamName: string;
  inviterEmail: string | null;
  role: "agent" | "admin";
  token: string;
}

export async function sendTeamInviteEmail(params: InviteParams): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";
  const acceptUrl = `${appUrl}/invite/${encodeURIComponent(params.token)}`;
  const fromHuman = params.inviterEmail ?? `the ${params.teamName} team`;
  const roleHuman = params.role === "admin" ? "admin" : "agent";

  return sendEmail({
    to: params.to,
    replyTo: params.inviterEmail ?? undefined,
    subject: `${fromHuman} invited you to ${params.teamName} on VITA`,
    text: textBody({ ...params, acceptUrl, fromHuman, roleHuman }),
    html: htmlBody({ ...params, acceptUrl, fromHuman, roleHuman }),
    tags: [{ name: "type", value: "team_invite" }],
  });
}

interface BodyCtx extends InviteParams {
  acceptUrl: string;
  fromHuman: string;
  roleHuman: string;
}

function textBody(c: BodyCtx): string {
  return [
    `${c.fromHuman} invited you to join "${c.teamName}" on VITA as ${c.roleHuman === "admin" ? "an admin" : "an agent"}.`,
    "",
    `Accept the invite: ${c.acceptUrl}`,
    "",
    "If you don't have a VITA account yet, the link will walk you through signup with this same email.",
    "",
    "The invite expires in 14 days.",
  ].join("\n");
}

function htmlBody(c: BodyCtx): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a0a0a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">
      <tr><td style="padding:28px 28px 8px;">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;font-weight:600;">Team invite</div>
        <div style="margin-top:6px;font-size:22px;font-weight:700;line-height:1.25;">${esc(c.fromHuman)} invited you to <span style="color:#0a0a0a;">${esc(c.teamName)}</span></div>
      </td></tr>
      <tr><td style="padding:8px 28px 4px;font-size:14px;line-height:1.6;color:#1f2937;">
        <p style="margin:0 0 12px;">You've been added as ${c.roleHuman === "admin" ? "an <strong>admin</strong>" : "an <strong>agent</strong>"} on the <strong>${esc(c.teamName)}</strong> workspace on VITA.</p>
      </td></tr>
      <tr><td style="padding:12px 28px 24px;">
        <a href="${esc(c.acceptUrl)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;font-weight:600;font-size:13px;padding:11px 18px;border-radius:8px;text-decoration:none;">Accept invite</a>
        <div style="margin-top:14px;font-size:12px;color:#71717a;">Don't have a VITA account yet? The link walks you through signup with this email. Invite expires in 14 days.</div>
      </td></tr>
    </table>
    <div style="margin-top:14px;font-size:11px;color:#a1a1aa;">CGMIMM / VITA · <a href="${esc(process.env.NEXT_PUBLIC_APP_URL ?? "")}" style="color:#a1a1aa;">virtualtour.cgmimm.com</a></div>
  </td></tr>
</table>
</body></html>`;
}
