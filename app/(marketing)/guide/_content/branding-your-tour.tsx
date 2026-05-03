import { A, Callout, Checklist, H2, H3, Lead, LI, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        A virtual tour is a marketing asset — but it's also a piece of <em>you</em> that
        will live in MLS, get forwarded around, and end up in places you didn't put it.
        Branding it well takes about ten minutes once and pays back on every tour you ship
        from then on.
      </Lead>

      <H2 id="what-to-set">What you can brand</H2>
      <UL>
        <LI><Strong>Agent card</Strong> — your headshot, name, brokerage, phone, and email pinned to the top-right of the viewer.</LI>
        <LI><Strong>Logo</Strong> — your brokerage or personal-brand logo, shown alongside the property title.</LI>
        <LI><Strong>Accent color</Strong> — the color used for buttons, the lead-gate CTA, and the loading bar. Defaults to amber.</LI>
        <LI><Strong>Footer</Strong> — "Powered by Tourly" by default. Removed entirely on the Brokerage plan.</LI>
        <LI><Strong>Contact CTA</Strong> — the call-to-action button label and the action it triggers.</LI>
      </UL>

      <H2 id="set-once">Set it once, reuse forever</H2>
      <P>
        The branding panel saves a default that applies to every tour you create from then
        on. You don't have to re-enter your photo and contact info per listing — only the
        property-specific bits (title, address, lead gate copy).
      </P>
      <Callout tone="tip" title="Defaults vs overrides">
        The branding you set on your team profile is the default. Each tour can override
        any field — useful when you're co-listing with another agent and want both names on
        that one tour, or when a luxury listing needs different colors than your usual.
      </Callout>

      <H2 id="agent-card">The agent card</H2>
      <P>
        The most important branding element. Get it right:
      </P>
      <Checklist
        items={[
          "Headshot — square, 400×400 minimum, professionally taken if at all possible",
          "Full name as you sign listings (not 'Bob' if your sign says 'Robert')",
          "Brokerage name as required by your local MLS rules",
          "License number — required in many states; check yours",
          "Direct phone (not the brokerage line — buyers want you specifically)",
          "Email that you actually check (and is also in your CRM as a known address)",
        ]}
      />
      <Callout tone="warn" title="Watch your local advertising rules">
        Many states and MLS boards have specific rules about how license numbers, brokerage
        names, and equal-housing logos must appear in marketing. The same rules apply to
        virtual tours. If you're unsure, copy the format from your business card or yard
        sign — those have already cleared compliance.
      </Callout>

      <H2 id="logo">The logo</H2>
      <P>
        Upload a transparent PNG, ideally with a horizontal aspect ratio (3:1 or wider works
        best). Two paths:
      </P>
      <UL>
        <LI>
          <Strong>Brokerage logo</Strong> — required by some brokerages, expected by most
          buyers in established firms. Use the version your broker provided in their
          marketing kit.
        </LI>
        <LI>
          <Strong>Personal-brand logo</Strong> — if you've built a personal brand (your
          initials, a mark, a wordmark), use it. Top producers usually have one.
        </LI>
      </UL>
      <P>
        If you have neither, leave the logo blank — the agent card alone is enough. Don't
        upload a low-res JPG with a white background; it looks worse than no logo at all.
      </P>

      <H2 id="colors">Accent color</H2>
      <P>
        The default amber is friendly and reads well on every background. If your brand
        identity has its own color, use it — but pick one with enough contrast against
        white text to stay readable on the lead-gate button.
      </P>
      <P>
        Quick test: the color you pick will appear as a button with white text on top.
        Squint at the preview. If "Submit" is hard to read, pick a darker shade.
      </P>

      <H2 id="cta">The contact CTA</H2>
      <P>
        Default is "Contact agent" and opens the lead-capture modal. You can change the
        copy and the action:
      </P>
      <UL>
        <LI><Strong>"Schedule a showing"</Strong> — opens the lead modal asking for a preferred date/time.</LI>
        <LI><Strong>"Get the floor plan"</Strong> — opens the lead modal and emails the floor plan PDF on submission.</LI>
        <LI><Strong>"Make an offer"</Strong> — for hot listings; sets expectation that the viewer is serious.</LI>
        <LI><Strong>"Start a chat"</Strong> — opens the lead modal with messaging-style copy.</LI>
      </UL>
      <P>
        We'll go deeper on what to ask for in <A href="/guide/lead-capture">Lead capture</A>.
      </P>

      <H2 id="white-label">White-labeling (Brokerage plan)</H2>
      <P>
        On the Brokerage tier:
      </P>
      <UL>
        <LI>The "Powered by Tourly" footer is removed entirely.</LI>
        <LI>You can point a custom subdomain (e.g. <code>tours.yourbrokerage.com</code>) at your tours via CNAME.</LI>
        <LI>The viewer's loading screen uses your accent color and logo, not ours.</LI>
        <LI>Email notifications to leads come from your domain (DKIM setup required — we'll walk you through it).</LI>
      </UL>

      <H2 id="consistency">Consistency across listings</H2>
      <P>
        The whole reason to set branding centrally is so every tour you ship looks like it
        came from the same firm. A buyer who walked through three of your tours should
        recognize the chrome before they read the address. That recognition compounds.
      </P>

      <H2 id="next">What's next</H2>
      <P>
        Tour looks like yours. Last thing before you publish: the part that pays for the
        whole platform. <A href="/guide/lead-capture">Lead capture</A>.
      </P>
    </>
  );
}
