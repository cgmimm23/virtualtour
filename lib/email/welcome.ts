// Welcome email — fires from /auth/callback after a brand-new signup's email
// confirmation exchange succeeds (the signup action threads ?welcome=1 onto
// the callback URL). One-shot per account; subsequent confirms / logins
// don't re-send because we only send on the first callback hop.

import "server-only";
import { sendEmail, esc } from "./client";

interface WelcomeParams {
  to: string;
  firstName?: string | null;
}

export async function sendWelcomeEmail(params: WelcomeParams): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";
  const dashUrl = `${appUrl}/dashboard`;
  const guideUrl = `${appUrl}/guide`;
  const hello = params.firstName?.trim() ? `Hi ${params.firstName.trim()},` : "Hi,";

  return sendEmail({
    to: params.to,
    subject: "Welcome to VITA — your first tour, three steps from here",
    text: textBody({ hello, dashUrl, guideUrl }),
    html: htmlBody({ hello, dashUrl, guideUrl }),
    tags: [{ name: "type", value: "welcome" }],
  });
}

interface BodyCtx {
  hello: string;
  dashUrl: string;
  guideUrl: string;
}

function textBody(c: BodyCtx): string {
  return [
    c.hello,
    "",
    "Thanks for trying VITA — AI-powered 360 tours for real estate.",
    "",
    "Three steps to your first published tour:",
    "  1. Click 'New tour' on your dashboard and give it a name + address.",
    "  2. Drop in your 360 photos (equirectangular from Insta360, Theta, etc.).",
    "  3. Hit 'Share' → Publish → copy the link to your listing or DM.",
    "",
    `Dashboard: ${c.dashUrl}`,
    `Photography guide (camera tips, equirectangular export, what makes a great pano):`,
    `  ${c.guideUrl}`,
    "",
    "Reply directly if anything's confusing — I read every email.",
    "",
    "— Jonathan",
    "  CGMIMM / VITA",
  ].join("\n");
}

function htmlBody(c: BodyCtx): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a0a0a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">
      <tr><td style="padding:28px 28px 4px;">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;font-weight:600;">Welcome</div>
        <div style="margin-top:6px;font-size:22px;font-weight:700;line-height:1.2;">Your first tour, three steps from here.</div>
      </td></tr>
      <tr><td style="padding:8px 28px 4px;font-size:14px;line-height:1.6;color:#1f2937;">
        <p style="margin:0 0 12px;">${esc(c.hello)}</p>
        <p style="margin:0 0 12px;">Thanks for trying VITA. Here's the fastest path from signup to a published 360 tour:</p>
      </td></tr>
      <tr><td style="padding:0 28px;">
        <ol style="margin:4px 0 16px;padding-left:18px;font-size:14px;line-height:1.7;color:#1f2937;">
          <li><strong>Create the tour.</strong> Click <em>New tour</em> on your dashboard, name it, drop in the address.</li>
          <li><strong>Add your 360 photos.</strong> Drag equirectangular JPEGs (from Insta360, Ricoh Theta, etc.) onto the upload area. We resize automatically.</li>
          <li><strong>Publish &amp; share.</strong> Hit <em>Share</em>, flip to <em>Published</em>, copy the link onto your MLS / social / DMs.</li>
        </ol>
      </td></tr>
      <tr><td style="padding:12px 28px 24px;">
        <a href="${esc(c.dashUrl)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;font-weight:600;font-size:13px;padding:10px 16px;border-radius:8px;text-decoration:none;margin-right:8px;">Go to dashboard</a>
        <a href="${esc(c.guideUrl)}" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-weight:600;font-size:13px;padding:9px 16px;border:1px solid #e5e7eb;border-radius:8px;text-decoration:none;">Read the guide</a>
        <div style="margin-top:14px;font-size:12px;color:#71717a;">Reply directly if anything's confusing — Jonathan reads every email.</div>
      </td></tr>
    </table>
    <div style="margin-top:14px;font-size:11px;color:#a1a1aa;">CGMIMM / VITA · <a href="${esc(process.env.NEXT_PUBLIC_APP_URL ?? "")}" style="color:#a1a1aa;">virtualtour.cgmimm.com</a></div>
  </td></tr>
</table>
</body></html>`;
}
