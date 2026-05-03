import { A, Callout, CompareTable, H2, H3, KeyValue, Lead, LI, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        Lead capture is the reason Tourly exists. A pretty tour without lead capture is a
        marketing brochure; a tour with a well-tuned lead gate is a CRM input that closes
        deals. Three patterns work — and the choice between them depends on your market,
        your follow-up speed, and how serious your average viewer is.
      </Lead>

      <H2 id="three-patterns">The three patterns</H2>
      <CompareTable
        columns={["Pattern", "When it appears", "Conversion", "Use when"]}
        rows={[
          [
            <Strong key="g">Lead gate</Strong>,
            "After 3 scenes or 30 seconds",
            "~12–18% of viewers",
            "You want every serious viewer's email and have fast follow-up.",
          ],
          [
            <Strong key="c">Contact button</Strong>,
            "Always available, never blocking",
            "~3–5% of viewers",
            "Hot listings where buyers self-identify; or low-trust markets.",
          ],
          [
            <Strong key="s">Schedule a tour</Strong>,
            "After viewer hits a specific scene",
            "~5–8% of viewers",
            "High-intent listings; you want showings booked, not lookers.",
          ],
        ]}
      />
      <P>
        These aren't mutually exclusive. The default Tourly setup runs the gate{" "}
        <em>and</em> a persistent contact button — the gate catches the silent majority,
        the button catches the few who are ready to talk.
      </P>

      <H2 id="lead-gate">The lead gate</H2>
      <P>
        The gate is a modal that appears after a configurable trigger — usually after the
        viewer has visited 3 scenes, or has been in the tour for 30 seconds. They have to
        provide an email to continue.
      </P>
      <H3 id="gate-config">Configuration</H3>
      <KeyValue
        items={[
          { k: "Trigger after N scenes", v: "Default 3. Lower = more captures, higher friction. Higher = fewer captures, less annoyance. Don't go above 5." },
          { k: "Trigger after N seconds", v: "Default 30. Whichever trigger fires first opens the gate." },
          { k: "Headline", v: 'Default: "Want to keep exploring?" — works. Try variants: "See the rest of the tour →" or "Get the full listing details".' },
          { k: "Subhead", v: "Optional. One sentence explaining what the viewer gets in return for the email." },
          { k: "Required fields", v: "Email is mandatory. Name is recommended. Phone is optional but increases lead quality dramatically when you require it." },
          { k: "Skip option", v: "If on, viewer can dismiss the gate once and continue. We recommend leaving this on — it filters tire-kickers without burning bridges." },
        ]}
      />

      <H3 id="gate-copy">Gate copy that works</H3>
      <P>
        Default copy is fine. If you want to optimize, two patterns we've seen convert:
      </P>
      <UL>
        <LI>
          <Strong>The "in exchange for" pattern.</Strong> "Drop your email — we'll send the
          floor plan and the inspection report." Trades a clear deliverable for the email,
          and now you have a reason to follow up two days later ("Just checking the floor
          plan came through OK").
        </LI>
        <LI>
          <Strong>The "save it for later" pattern.</Strong> "Bookmark this tour to your
          email — we'll send a link you can come back to anytime." Frames the gate as a
          favor to the viewer, not a wall.
        </LI>
      </UL>

      <H2 id="contact-button">The persistent contact button</H2>
      <P>
        The agent card in the top-right has a "Contact" button by default. Clicking it
        opens a different modal — usually with phone field required, since these viewers
        are explicitly saying they want to talk.
      </P>
      <Callout tone="tip" title="The phone-field tradeoff">
        Adding "phone (optional)" doesn't help — viewers leave it blank. Either don't ask
        for it, or make it required. Required phone reduces submission rate ~30% but
        roughly doubles per-lead close rate.
      </Callout>

      <H2 id="schedule">Schedule-a-tour as a hotspot</H2>
      <P>
        For your hottest listings: place a "Schedule a tour" hotspot in the kitchen and
        primary suite — the rooms with the highest dwell time. The hotspot opens a modal
        with email + name + preferred time slot.
      </P>
      <P>
        This is the highest-quality lead type a tour can produce. Anyone who fills it out
        is past the "interested" stage and into "wants to walk through it". Treat them like
        gold.
      </P>

      <H2 id="follow-up">Follow-up speed is the whole game</H2>
      <P>
        Fast follow-up wins listings. Slow follow-up wastes leads. Internal stats from
        client tours suggest:
      </P>
      <UL>
        <LI>Reply within 5 minutes → ~60% of leads engage in conversation.</LI>
        <LI>Reply within 1 hour → ~35%.</LI>
        <LI>Reply within 24 hours → ~12%.</LI>
        <LI>Reply after 24 hours → less than 5%, and they're cold.</LI>
      </UL>
      <P>
        If you can't personally follow up within an hour, set up a CRM auto-response that
        at least acknowledges the lead and tells them you'll be in touch shortly. It buys
        you time without burning the lead.
      </P>

      <H2 id="dont-be-sketchy">Don't be sketchy</H2>
      <P>
        Three rules:
      </P>
      <UL>
        <LI>
          <Strong>Don't gate the cover scene.</Strong> Buyers should see at least the front
          exterior and one interior before being asked for an email. Gating the very first
          frame feels like a paywall and viewers bounce.
        </LI>
        <LI>
          <Strong>Don't pretend the gate is something else.</Strong> "Verify you're not a
          bot" or "Sign in to continue" are dishonest framing. The viewer knows what it is —
          treat them like adults.
        </LI>
        <LI>
          <Strong>Honor unsubscribes immediately.</Strong> A captured email is a relationship,
          not a transaction. Get reported as spam by enough leads and your delivery to
          everyone suffers.
        </LI>
      </UL>

      <H2 id="crm">Pushing leads to your CRM</H2>
      <P>
        On the Solo plan: leads land in your Tourly dashboard and trigger an email
        notification to you. CSV export is one click.
      </P>
      <P>
        On Team and Brokerage: native integrations push leads directly into Follow Up Boss,
        kvCORE, and Sierra Interactive. Zapier covers the long tail (Google Sheets,
        Mailchimp, HubSpot, anything else). Set this up before your first listing — there's
        no good reason to handle leads manually.
      </P>

      <H2 id="next">What's next</H2>
      <P>
        Tour built, branded, lead capture wired up. Time to actually get it in front of
        buyers: <A href="/guide/sharing-and-embedding">sharing and embedding</A>.
      </P>
    </>
  );
}
