import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AcceptInviteButton } from "./controls";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Team invite — VITA",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitePage({ params }: PageProps) {
  const { token } = await params;

  // Looked up by the unique token (the bearer secret). No team scope: the
  // visitor isn't necessarily a member yet — identity is proven by the email
  // match below before they can accept.
  const invite = await prisma.team_invites.findUnique({
    where: { token },
    select: {
      id: true,
      team_id: true,
      email: true,
      role: true,
      expires_at: true,
      accepted_at: true,
      teams: { select: { name: true } },
    },
  });

  if (!invite) {
    return (
      <Shell title="Invite not found">
        <p>The invite link is wrong or has been revoked.</p>
      </Shell>
    );
  }

  const teamName = invite.teams?.name ?? "the team";

  if (invite.accepted_at) {
    return (
      <Shell title="Invite already used">
        <p>
          This invite for <strong>{invite.email}</strong> has already been accepted.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Sign in
        </Link>
      </Shell>
    );
  }
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return (
      <Shell title="Invite expired">
        <p>
          This invite for <strong>{invite.email}</strong> has expired. Ask {teamName} to send a new
          one.
        </p>
      </Shell>
    );
  }

  const user = await getUser();
  if (!user) {
    // No session yet — direct to signup with this email pre-set. After they
    // confirm their email, /auth/callback drops them back at /invite/<token>
    // and they hit Accept.
    const next = encodeURIComponent(`/invite/${token}`);
    return (
      <Shell title={`Join ${teamName}`}>
        <p>
          You&apos;ve been invited to <strong>{teamName}</strong> as <strong>{invite.role}</strong>{" "}
          on <strong>{invite.email}</strong>. Create an account (or sign in) with that email to
          accept.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/signup?next=${next}`}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Create account
          </Link>
          <Link
            href={`/login?next=${next}`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  if (user.email && user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <Shell title="Wrong account">
        <p>
          You&apos;re signed in as <strong>{user.email}</strong>, but this invite was sent to{" "}
          <strong>{invite.email}</strong>. Sign out and sign back in with that email to accept.
        </p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            Sign out
          </button>
        </form>
      </Shell>
    );
  }

  // Happy path: signed in as the right user, invite valid → ready to accept.
  return (
    <Shell title={`Join ${teamName}`}>
      <p>
        Accept this invite to join <strong>{teamName}</strong> as <strong>{invite.role}</strong>.
      </p>
      <div className="mt-5">
        <AcceptInviteButton token={token} />
      </div>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{children}</div>
    </div>
  );
}
