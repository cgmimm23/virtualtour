// POST /admin/settings/change-password — lets the logged-in admin change their
// own password from the admin portal. Updates auth.users.encrypted_password
// (bcrypt). Submitted from the "Change password" form on /admin/settings.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";

const BASE = "https://virtualtour.cgmimm.com";

export async function POST(req: Request) {
  const user = await requirePlatformAdmin("/admin/settings");
  const form = await req.formData();
  const pw = String(form.get("password") || "");
  const confirm = String(form.get("confirm") || "");

  const url = new URL("/admin/settings", BASE);
  if (pw.length < 8) {
    url.searchParams.set("pw_error", "Password must be at least 8 characters.");
    return NextResponse.redirect(url, { status: 303 });
  }
  if (pw !== confirm) {
    url.searchParams.set("pw_error", "Passwords do not match.");
    return NextResponse.redirect(url, { status: 303 });
  }

  const hash = await bcrypt.hash(pw, 10);
  await prisma.users.update({
    where: { id: user.id },
    data: { encrypted_password: hash },
  });

  url.searchParams.set("pw_ok", "1");
  return NextResponse.redirect(url, { status: 303 });
}
