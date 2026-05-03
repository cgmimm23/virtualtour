import { A, Callout, Checklist, H2, H3, Lead, LI, OL, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        A tour isn't a list of every room — it's a guided walk in the order a real buyer
        would experience the property. Plan the order before you start shooting, and you'll
        capture in 15 minutes what would otherwise take 45.
      </Lead>

      <H2 id="how-many-scenes">How many scenes is the right number?</H2>
      <P>
        For a typical 3-bed/2-bath house, <Strong>10–14 scenes</Strong> is the sweet spot.
        That's enough to cover everything that sells the home and not so much that the
        viewer abandons before reaching the lead gate.
      </P>
      <UL>
        <LI><Strong>Studio / 1-bed condo:</Strong> 4–6 scenes.</LI>
        <LI><Strong>Typical single-family home:</Strong> 10–14 scenes.</LI>
        <LI><Strong>Luxury / 5+ bedroom:</Strong> 18–25 scenes — but break it into logical zones.</LI>
        <LI><Strong>Land or vacant lot:</Strong> 3–5 scenes — exterior corners and the buildable area.</LI>
      </UL>
      <Callout tone="warn" title="Don't shoot every closet">
        Closets and bathrooms with no windows tend to look like dim caves in 360. Skip pantries,
        utility closets, and powder rooms unless they're a notable feature (walk-in pantry,
        designer powder room). Buyers don't expect them.
      </Callout>

      <H2 id="standard-order">A standard walk order that always works</H2>
      <P>
        Match the order a buyer would experience the home if you walked them through in
        person. This is also the order you'll shoot in — no backtracking.
      </P>
      <OL>
        <LI><Strong>Front exterior</Strong> — from the curb, framing the house.</LI>
        <LI><Strong>Approach / front porch</Strong> — what they see walking up.</LI>
        <LI><Strong>Foyer / entry</Strong> — first interior impression.</LI>
        <LI><Strong>Living room</Strong> — usually the heart of the first floor.</LI>
        <LI><Strong>Dining room</Strong> — if separate from kitchen.</LI>
        <LI><Strong>Kitchen</Strong> — the most important interior scene. Take time here.</LI>
        <LI><Strong>Family room / den</Strong> — if applicable.</LI>
        <LI><Strong>Powder room</Strong> — only if notable.</LI>
        <LI><Strong>Stairs / hallway</Strong> — the transition.</LI>
        <LI><Strong>Primary bedroom</Strong> — the second-most-important interior scene.</LI>
        <LI><Strong>Primary bathroom</Strong> — especially if recently renovated.</LI>
        <LI><Strong>Secondary bedrooms</Strong> — one each, no need to be elaborate.</LI>
        <LI><Strong>Hall bath</Strong> — only if not run-of-the-mill.</LI>
        <LI><Strong>Basement / bonus room</Strong> — if finished.</LI>
        <LI><Strong>Garage</Strong> — only if oversized, finished, or notable.</LI>
        <LI><Strong>Backyard</Strong> — from the patio, framing the yard.</LI>
        <LI><Strong>Pool / deck / outdoor feature</Strong> — separate scene if it's a selling point.</LI>
      </OL>

      <H2 id="kitchen-priority">The kitchen and primary suite carry the listing</H2>
      <P>
        These two rooms are statistically what buyers spend the most time on in any tour.
        Treat them like hero shots:
      </P>
      <UL>
        <LI><Strong>Kitchen:</Strong> consider 2 scenes — one from the dining-room side framing the island, one from the stove side framing the dining/living view. Costs you 3 minutes of shooting, doubles dwell time.</LI>
        <LI><Strong>Primary suite:</Strong> 1 scene in the bedroom centered to feature the bed wall, 1 scene in the en-suite framing the vanity.</LI>
      </UL>

      <H2 id="forgotten">Rooms most agents forget</H2>
      <Checklist
        items={[
          "Laundry room — buyers care more about this than agents think",
          "Walk-in closets in the primary suite (size sells)",
          "View from the back yard looking at the house — context",
          "Any covered outdoor space — patios, screened porches",
          "Mudroom or drop zone near the garage entry",
          "Home office — every listing needs one in 2026",
        ]}
      />

      <H2 id="walk-the-house">Walk the house once before shooting</H2>
      <P>
        Before you set up the camera, do a 5-minute walk-through with the seller (or alone)
        and write the scene order on your phone. It saves you from realizing in the kitchen
        that you forgot to shoot the foyer and now you have to backtrack.
      </P>
      <P>
        While you walk:
      </P>
      <UL>
        <LI>Open every interior door.</LI>
        <LI>Open blinds in rooms you'll shoot.</LI>
        <LI>Switch on every light — it takes 90 seconds and the difference is enormous.</LI>
        <LI>Ask the seller to keep pets and kids in one specific room you'll shoot last (or skip).</LI>
      </UL>

      <H2 id="time-budget">A realistic time budget</H2>
      <P>
        For a typical 12-scene tour:
      </P>
      <Checklist
        items={[
          "5 min — walk the house, plan order, open doors and lights",
          "15–20 min — shooting (about 90 sec per scene including setup and a deep breath)",
          "5 min — quick chimp on the camera screen, reshoot any obvious problems",
          "10 min — export from camera/app to JPG, name files, AirDrop or upload",
          "20–30 min — upload to Tourly, link doorways, set opening views, add branding",
        ]}
      />
      <P>
        Total: about an hour, end to end. After your third tour you'll be at 35 minutes.
      </P>

      <H2 id="next">What's next</H2>
      <P>
        Photos in hand, plan in head — time to get them into Tourly.{" "}
        <A href="/guide/uploading-your-photos">The next chapter</A> walks through the upload
        flow and what's happening behind the scenes when you see the "processing" indicator.
      </P>
    </>
  );
}
