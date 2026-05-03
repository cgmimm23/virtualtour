import { A, Callout, H2, Lead, LI, OL, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        A 360° virtual tour is a sequence of panoramic photos linked together so a buyer can
        walk through a property from their phone, in any direction, at any time of day, without
        an agent present. Done well, it does three things at once: it filters out tire-kickers,
        it captures contact info from real prospects, and it makes the listing look like
        someone took it seriously.
      </Lead>

      <H2 id="what-it-isnt">What a 360 tour is — and what it isn't</H2>
      <P>
        It's not a video. Video controls the viewer's eye; a 360 tour gives that control to
        the buyer. They look where <em>they</em> want — out the kitchen window, up at the
        ceiling height, down at the floor finish.
      </P>
      <P>
        It's not a Matterport-style 3D model either. Matterport produces a continuous mesh you
        can drift through; a 360 tour is a graph of stitched photos with hotspots that jump
        you between rooms. The mesh looks impressive in a sales demo, but for a house going
        on the market this Friday it's overkill — it costs more, takes longer, and converts
        no better.
      </P>

      <Callout tone="info" title="The honest tradeoff">
        A 360 photo tour is faster to produce, cheaper, and looks great on mobile. It will
        not let a buyer measure a doorway or do floor-plan analysis. For 95% of residential
        listings under $2M, this is exactly the tradeoff you want.
      </Callout>

      <H2 id="when-it-helps">When a tour actually moves the needle</H2>
      <P>
        Not every listing needs a virtual tour. Some clearly do:
      </P>
      <UL>
        <LI>
          <Strong>Out-of-area buyers.</Strong> Relocations, second homes, investors. They
          can't drive by. The tour replaces three FaceTime walkthroughs.
        </LI>
        <LI>
          <Strong>Higher price points.</Strong> Above your local median, buyers expect more
          marketing. A tour is now table stakes; not having one is a tell.
        </LI>
        <LI>
          <Strong>Hard-to-show properties.</Strong> Tenant-occupied, vacant rural, or
          anything where coordinating a showing is a chore. Let the tour do the first showing.
        </LI>
        <LI>
          <Strong>Luxury rentals and short-term lets.</Strong> Tours convert listing browsers
          to bookers at a meaningfully higher rate than photos alone.
        </LI>
        <LI>
          <Strong>New construction.</Strong> Sell from a model unit and a tour, even if the
          building isn't done yet.
        </LI>
      </UL>
      <P>
        And some where it's optional polish: a $400k starter home with strong curb appeal in
        a hot market will sell in a weekend whether or not it has a tour. Spend the time
        elsewhere.
      </P>

      <H2 id="lead-capture">Why lead capture is the actual product</H2>
      <P>
        A pretty tour is nice. A tour that gives you the email address of every serious
        prospect who watched it is a different category of tool — that's a CRM input, not just
        a marketing asset. The whole reason Tourly exists is that competitor tours treat lead
        capture as an afterthought (or sell it as a $50/mo add-on); we put it in the gate
        position.
      </P>
      <P>
        We'll cover the mechanics in <A href="/guide/lead-capture">Lead capture</A>, but the
        framing matters here: when you set up your first tour, decide up front what you want a
        viewer to <em>do</em>. Schedule a showing? Reply with questions? Get on a list for the
        next listing? The tour should funnel toward that single action.
      </P>

      <H2 id="anatomy">Anatomy of a Tourly tour</H2>
      <P>
        A tour is made up of:
      </P>
      <OL>
        <LI>
          <Strong>Scenes</Strong> — one 360 photo per location. Front yard, foyer, living
          room, kitchen, etc.
        </LI>
        <LI>
          <Strong>Hotspots</Strong> — clickable markers placed inside a scene. Most of them
          are doorways that take you to the next room. Some open info panels, embedded video,
          or external links.
        </LI>
        <LI>
          <Strong>An opening view</Strong> per scene — the direction and zoom level the camera
          starts at when a viewer arrives in that room. Get this wrong and the whole tour
          feels disorienting.
        </LI>
        <LI>
          <Strong>Branding</Strong> — your logo, headshot, name, and a contact CTA pinned to
          the top-right corner of the viewer.
        </LI>
        <LI>
          <Strong>A lead gate</Strong> — the form that appears after a viewer has poked
          around long enough to be worth capturing.
        </LI>
      </OL>
      <P>
        That's it. Five concepts. The rest of this guide is just doing each of them well.
      </P>

      <H2 id="next">What's next</H2>
      <P>
        Before any of that matters, you need a camera that produces clean equirectangular
        photos. <A href="/guide/choosing-a-camera">The next chapter</A> walks through what's
        worth buying — and what to skip.
      </P>
    </>
  );
}
