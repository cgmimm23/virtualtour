import { A, Callout, Code, H2, H3, KeyValue, Lead, LI, OL, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        Every tour gets a permanent share URL the moment you publish it. Where you put that
        URL matters more than how the tour itself looks — a brilliant tour seen by no one
        moves no listings.
      </Lead>

      <H2 id="share-url">The share URL</H2>
      <P>
        Each published tour has a clean URL like:
      </P>
      <P>
        <Code>https://tour.tourly.app/t/your-tour-slug</Code>
      </P>
      <P>
        On the Brokerage plan you can map this to your own subdomain, e.g.{" "}
        <Code>https://tours.yourbrokerage.com/123-main-st</Code>.
      </P>
      <P>
        The URL produces a clean social-share preview — when pasted into iMessage, WhatsApp,
        Slack, Facebook, or LinkedIn, it auto-expands to show the cover scene image, the
        property title, and a short description. No extra setup.
      </P>

      <H2 id="where-to-put">Where to put the URL</H2>

      <H3 id="mls">MLS</H3>
      <P>
        Every MLS has a "Virtual Tour URL" or "Branded Tour URL" field on the listing
        record. Paste your tour URL there. Many MLSes also have an unbranded variant for
        syndication to Zillow, Redfin, and Realtor.com — for that field, append{" "}
        <Code>?nobrand=1</Code> to the URL and we'll hide the agent card.
      </P>
      <Callout tone="warn" title="Branded vs unbranded">
        Some MLSes have rules against agent-branded content in syndicated feeds. Use the
        unbranded variant for the syndication field and the regular branded URL for the
        listing's primary tour link. Check with your local board — penalties can include
        listing removal.
      </Callout>

      <H3 id="zillow">Zillow / Redfin / Realtor.com</H3>
      <P>
        These pull from MLS automatically when you fill the virtual tour field. You usually
        don't need to do anything Zillow-specific — the URL flows through. Verify after the
        listing goes live by checking the public listing page on each site.
      </P>

      <H3 id="your-site">Your agent site</H3>
      <P>
        If you have a personal site or a brokerage profile page, embed the tour as a full
        section, not a tiny thumbnail. The tour is the listing's biggest selling tool —
        treat it as a hero element. Embedding code below.
      </P>

      <H3 id="social">Social</H3>
      <UL>
        <LI>
          <Strong>Instagram & Facebook</Strong> — paste the URL in your bio link aggregator
          (Linktree, Beacons, Stan), or in Stories with the link sticker. The auto-preview
          works on Facebook posts.
        </LI>
        <LI>
          <Strong>LinkedIn</Strong> — paste in a post; the preview card shows the cover
          scene. Pin a top-performing tour to your profile.
        </LI>
        <LI>
          <Strong>YouTube</Strong> — record a 60-second walkthrough video of the tour and
          link to the live tour in the description. The video gets reach; the link converts.
        </LI>
        <LI>
          <Strong>TikTok</Strong> — similar play. Show a phone walkthrough of the tour as
          the visual; link in bio.
        </LI>
      </UL>

      <H3 id="email">Email signature and campaigns</H3>
      <P>
        Replace your "see my listings" link with a link to your most recent tour. It
        updates the signature automatically each time you publish a new tour (some
        signature tools support this; Salesforce-Outlook integrations make it trivial).
      </P>
      <P>
        For listing campaigns: make the tour link the primary CTA. Don't bury it under
        photos — buyers click through 3× more on tour links than on "View listing"
        buttons.
      </P>

      <H3 id="qr">QR codes for open houses, yard signs, flyers</H3>
      <P>
        Generate a QR code for the tour URL (any free QR generator works — we recommend
        not using a "smart" QR service that wraps your link in a tracker). Print on:
      </P>
      <UL>
        <LI>Yard sign rider — "Scan for virtual tour"</LI>
        <LI>Open-house flyers and the property info sheet</LI>
        <LI>Business card back, for any agent who actively prospects</LI>
        <LI>Postcards in mailers around the listing</LI>
      </UL>

      <H2 id="embed">Embedding on your site</H2>
      <P>
        Copy this iframe and paste it into any HTML page (WordPress block, Squarespace
        embed, Webflow, raw HTML, etc.):
      </P>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-neutral-900 p-4 text-xs leading-relaxed text-neutral-100">
{`<iframe
  src="https://tour.tourly.app/t/your-tour-slug?embed=1"
  width="100%"
  height="600"
  frameborder="0"
  allow="fullscreen; gyroscope; accelerometer"
  loading="lazy"
></iframe>`}
      </pre>
      <P>
        The <Code>?embed=1</Code> parameter strips the outer Tourly chrome so the tour
        feels native to your site. The <Code>allow</Code> attributes are critical —
        without them, fullscreen and mobile gyro look-around won't work.
      </P>
      <Callout tone="tip" title="Responsive embed">
        For a responsive height that scales with width, wrap the iframe in a div with{" "}
        <Code>position: relative; padding-bottom: 56.25%;</Code> (16:9) and absolutely
        position the iframe inside it. The Tourly viewer is happy at any aspect ratio
        wider than 4:3.
      </Callout>

      <H2 id="link-tracking">Link tracking and UTMs</H2>
      <P>
        Append UTM parameters to your tour URL to track where viewers came from:
      </P>
      <P>
        <Code>https://tour.tourly.app/t/your-slug?utm_source=mls&utm_medium=listing</Code>
      </P>
      <P>
        Tourly's analytics records the referrer per session, so you'll see which channels
        produced views and which produced leads. Common sources to tag:
      </P>
      <KeyValue
        items={[
          { k: "utm_source=mls", v: "Generic MLS embedded link" },
          { k: "utm_source=zillow", v: "Zillow listing page" },
          { k: "utm_source=email", v: "Direct email campaign" },
          { k: "utm_source=ig", v: "Instagram bio link" },
          { k: "utm_source=qr", v: "Yard sign or printed flyer" },
        ]}
      />

      <H2 id="copy-paste">A ship checklist</H2>
      <P>
        Before you mark the tour as published:
      </P>
      <OL>
        <LI>Open the share URL in an incognito window — does it look right with no cache?</LI>
        <LI>Open it on your phone — do all opening views work in portrait?</LI>
        <LI>Click every doorway hotspot — do they all link somewhere sensible?</LI>
        <LI>Let the lead gate fire — does the email arrive in your inbox?</LI>
        <LI>Paste the URL into iMessage to a colleague — does the preview look good?</LI>
      </OL>

      <H2 id="next">What's next</H2>
      <P>
        Tour is live, link is everywhere. Last chapter:{" "}
        <A href="/guide/analytics-and-troubleshooting">
          analytics, what to watch, and how to fix things when they break
        </A>.
      </P>
    </>
  );
}
