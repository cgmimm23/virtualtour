// One-off rescue tool for when the founder is locked out of their own app.
// Uses SUPABASE_SERVICE_ROLE_KEY from .env.local to talk to the Admin API,
// which bypasses both "confirm email" and any UI-side signup flakiness.
//
// Usage (from repo root, PowerShell):
//   node scripts/auth-rescue.mjs list
//   node scripts/auth-rescue.mjs reset jonathan@cgmimm.com "NewPassw0rd!"
//   node scripts/auth-rescue.mjs create jonathan@cgmimm.com "NewPassw0rd!"
//
// `create` makes a pre-confirmed account (skips email verification) — handy
// if the account never actually got created. The platform_admins trigger
// (migration 0004) will auto-promote it if the email is jonathan@cgmimm.com.
//
// DELETE THIS FILE after you're back in. It exists so the service role key
// is not lying around in shell history.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const [, , cmd, emailArg, passwordArg] = process.argv;

function usage() {
  console.error("Usage:");
  console.error("  node scripts/auth-rescue.mjs list");
  console.error("  node scripts/auth-rescue.mjs reset <email> <new-password>");
  console.error("  node scripts/auth-rescue.mjs create <email> <new-password>");
  process.exit(1);
}

async function findUserByEmail(email) {
  // listUsers is paginated; the founder's user count is tiny, one page is fine.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

if (cmd === "list") {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    console.error("listUsers failed:", error.message);
    process.exit(1);
  }
  if (data.users.length === 0) {
    console.log("(no users exist — you'll need `create`, not `reset`)");
  } else {
    for (const u of data.users) {
      const confirmed = u.email_confirmed_at ? "confirmed" : "UNCONFIRMED";
      console.log(`${u.id}  ${u.email}  [${confirmed}]  created=${u.created_at}`);
    }
  }
} else if (cmd === "reset") {
  if (!emailArg || !passwordArg) usage();
  const user = await findUserByEmail(emailArg);
  if (!user) {
    console.error(`No user with email ${emailArg}. Did you mean \`create\`?`);
    process.exit(1);
  }
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: passwordArg,
    email_confirm: true,
  });
  if (error) {
    console.error("reset failed:", error.message);
    process.exit(1);
  }
  console.log(`OK — password set for ${user.email} (id ${user.id}). Sign in at /login.`);
} else if (cmd === "create") {
  if (!emailArg || !passwordArg) usage();
  const existing = await findUserByEmail(emailArg);
  if (existing) {
    console.error(`User ${emailArg} already exists. Use \`reset\` instead.`);
    process.exit(1);
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: emailArg,
    password: passwordArg,
    email_confirm: true,
  });
  if (error) {
    console.error("create failed:", error.message);
    process.exit(1);
  }
  console.log(`OK — created ${data.user.email} (id ${data.user.id}). Sign in at /login.`);
} else {
  usage();
}
