import { A, Callout, H2, H3, Lead, LI, OL, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        When a viewer first arrives in a scene, they see one specific direction at one
        specific zoom level. That's the "opening view" and you control it. It's the most
        underrated setting in any virtual tour platform — and the easiest one to get right.
      </Lead>

      <H2 id="why-it-matters">Why it matters</H2>
      <P>
        A buyer clicks the doorway hotspot. The screen fades and they arrive in the kitchen.
        What do they see first? If you've set the opening view well, they see the island
        with the dramatic pendant lighting. If you haven't, they see the wall of the pantry
        and have to drag around to find anything interesting.
      </P>
      <P>
        Multiply that across 12 scenes and you have either a tour that feels guided and
        intentional, or one that feels like the camera is broken.
      </P>

      <H2 id="three-controls">The three controls</H2>
      <UL>
        <LI>
          <Strong>Yaw</Strong> — horizontal rotation. Which way is the viewer facing? Think
          compass direction.
        </LI>
        <LI>
          <Strong>Pitch</Strong> — vertical tilt. Looking up at a vaulted ceiling, level at
          the wall, or down at the floor finish?
        </LI>
        <LI>
          <Strong>Field of view (FOV)</Strong> — zoom level. Wide angle (90°+) feels open
          and architectural; narrow (60°) feels intimate and focused on a detail.
        </LI>
      </UL>
      <Callout tone="info" title="Roll exists too, but rarely matters">
        Roll is the camera tilt — leaning the horizon left or right. Tourly normally keeps
        this at 0 (level). The only time you'd touch it is to fix a scene where the camera
        was held slightly tilted during shooting. If your camera has horizon-leveling
        enabled (Theta, Insta360 X4 default), you'll never need this.
      </Callout>

      <H2 id="how-to-set">How to set it in the editor</H2>
      <OL>
        <LI>Open a scene in the editor with <Strong>Editing</Strong> mode on.</LI>
        <LI>Drag the panorama until you're looking at what you want viewers to see first.</LI>
        <LI>Pinch or scroll to set the zoom level.</LI>
        <LI>The new view auto-saves the moment you let go of the mouse.</LI>
      </OL>
      <P>
        That's it — no button to hit. The scene now opens to that exact view every time
        someone arrives, including via a scene-link hotspot.
      </P>

      <H2 id="what-to-frame">What to frame in each room</H2>
      <UL>
        <LI><Strong>Front exterior</Strong> — the front of the house, dead center. This is the cover image; treat it like a magazine cover.</LI>
        <LI><Strong>Foyer</Strong> — looking down the main sight line into the rest of the house, not at the front door.</LI>
        <LI><Strong>Living room</Strong> — the focal feature: fireplace, big window, accent wall.</LI>
        <LI><Strong>Kitchen</Strong> — the island, or the run of cabinetry. Avoid framing on the fridge.</LI>
        <LI><Strong>Bedroom</Strong> — the bed wall (usually the headboard side). Wide enough to see the room is a real size.</LI>
        <LI><Strong>Bathroom</Strong> — the vanity if it's nice; the tub/shower if it's the standout feature.</LI>
        <LI><Strong>Backyard</Strong> — looking out at the yard, not back at the house.</LI>
      </UL>

      <H2 id="fov-rule">A simple FOV rule</H2>
      <P>
        Default to <Strong>90° FOV</Strong> for almost everything. It feels natural — close
        to what a camera lens around 24mm would show.
      </P>
      <UL>
        <LI>
          <Strong>Drop to 70°</Strong> in tight rooms or when you want to draw attention
          to a specific detail (a tile pattern, a piece of cabinet hardware).
        </LI>
        <LI>
          <Strong>Push to 110°</Strong> in dramatic spaces — vaulted living rooms, wide
          backyards. The wider FOV exaggerates the sense of space, which is exactly what
          you want there.
        </LI>
      </UL>
      <Callout tone="warn" title="Don't go above 120°">
        Above ~120° you start seeing visible distortion at the edges of the frame —
        straight lines bend, corners stretch. It feels fish-eye and amateur.
      </Callout>

      <H2 id="apply-to-all">"Apply to all scenes"</H2>
      <P>
        In the Align panel of the editor there's an <Strong>Apply to all scenes</Strong>{" "}
        button. It copies the current scene's yaw, pitch, FOV, or roll to every scene at
        once. Useful when:
      </P>
      <UL>
        <LI>You want every scene to start at FOV 90 — set it once, apply FOV to all.</LI>
        <LI>You want a consistent slight downward pitch across the whole tour for a "looking-at-the-room" feel.</LI>
      </UL>
      <P>
        Don't apply yaw to all scenes — every room has a different "best angle" so blanket
        yaw makes no sense.
      </P>

      <H2 id="check-on-mobile">Always check the result on a phone</H2>
      <P>
        Mobile screens are vertically oriented and shorter than monitors. A view that frames
        a kitchen island beautifully on desktop might cut off the island on a phone. After
        you've set opening views, open the share URL on your phone and walk through the tour
        once. Adjust any scene that doesn't read well in portrait orientation.
      </P>

      <H2 id="next">What's next</H2>
      <P>
        Navigation works, scenes open well-framed. Next, making the whole thing look like
        it belongs to <em>you</em>: <A href="/guide/branding-your-tour">branding your tour</A>.
      </P>
    </>
  );
}
