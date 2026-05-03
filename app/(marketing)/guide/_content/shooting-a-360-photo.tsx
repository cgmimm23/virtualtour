import { A, Callout, Checklist, H2, H3, Lead, LI, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        The difference between a tour that looks professional and one that looks like a
        Zillow drive-by isn't the camera — it's a handful of small decisions made in the
        first minute on site. Tripod height, exposure, where you stand, and what time of day
        you shot.
      </Lead>

      <H2 id="before-you-shoot">Before you press the shutter</H2>
      <Checklist
        items={[
          "Open every interior door so viewers can see through to the next room",
          "Turn on every light, including lamps, range hoods, and accent lighting",
          "Open blinds and curtains — natural light always wins",
          "Hide cables, remotes, mail, and anything that says 'someone lives here'",
          "Toilet seats down, kitchen counters cleared, beds made",
          "Pet bowls, litter boxes, leashes — out of frame",
        ]}
      />
      <P>
        This is staging, and it's the highest-leverage 5 minutes you'll spend on the entire
        shoot. A pristine kitchen photo will convert better than a 12K image of a cluttered
        one.
      </P>

      <H2 id="tripod-height">Tripod height</H2>
      <P>
        Set your tripod or monopod to <Strong>roughly eye level — 5'4″ to 5'8″</Strong>. This
        matters more than you'd think:
      </P>
      <UL>
        <LI>Too low and ceilings look oppressive, countertops loom.</LI>
        <LI>Too high and rooms feel like dollhouses, you see into pots on the stove.</LI>
        <LI>Eye level matches what a buyer would see walking in. That's the brain shortcut you want.</LI>
      </UL>
      <Callout tone="tip" title="Use a monopod, not a tripod">
        A monopod is one thin pole. You stand directly under the camera and your body is
        almost invisible from above. A tripod's three splayed legs end up in every shot and
        you'll spend hours editing them out.
      </Callout>

      <H2 id="hiding-yourself">Hiding yourself in the shot</H2>
      <P>
        A 360 camera sees everything. Including you. Three approaches, in order of preference:
      </P>
      <H3 id="hide-1">1. Stand under the camera with a Bluetooth remote (best)</H3>
      <P>
        With a tall monopod, your head is roughly inside the camera's nadir blind spot. You
        appear as a small smudge directly below the camera, which Tourly automatically masks
        with a logo or floor patch on most setups. Click the remote, hold still, done.
      </P>
      <H3 id="hide-2">2. Walk out of the room and trigger via app</H3>
      <P>
        Most 360 camera apps give you a 5–10 second self-timer. Set it, walk into the
        adjacent room, hide behind a wall. Reliable but slower — the rhythm matters when
        you're shooting 12 scenes in a tight window.
      </P>
      <H3 id="hide-3">3. Stand still and wear neutral clothing</H3>
      <P>
        If the first two aren't possible, stand at the seam where the camera's two lenses
        meet (you can usually feel it on the body of the camera). The stitching software
        tries to remove you. It mostly works on solid colors. Don't wear a logo'd shirt.
      </P>

      <H2 id="lighting">Lighting that doesn't ruin the shot</H2>
      <P>
        Every interior has three light sources fighting each other: window light (cool blue),
        bulb light (warm yellow), and any LED accent strips (often neon-tinted). The camera's
        auto white balance picks one and the others look wrong. Two ways to handle this:
      </P>
      <UL>
        <LI>
          <Strong>Shoot at the right time of day.</Strong> Mid-morning or late afternoon
          gives you ambient daylight without harsh window blowouts. Avoid 11am–2pm in
          summer — the sun coming through south-facing windows will burn out a third of the
          frame.
        </LI>
        <LI>
          <Strong>Don't fight it, embrace it.</Strong> If the listing has warm, lamp-lit
          living rooms, lean into that look — set the camera to "incandescent" white balance
          and the photos will feel cozy. Real-estate buyers respond to mood, not color
          accuracy.
        </LI>
      </UL>
      <Callout tone="warn" title="HDR mode: usually yes, sometimes no">
        Most 360 cameras have an HDR mode that takes 3–5 bracketed exposures and merges them.
        Use it for any room with a window. Skip it for rooms with no movement — sometimes
        single-shot is sharper if the scene is static and well-lit.
      </Callout>

      <H2 id="positioning">Where in the room to put the camera</H2>
      <P>
        The instinct is to put the camera in the middle of the room. Resist it. Center
        positioning makes every wall equidistant, which feels flat and boring on playback.
        Better:
      </P>
      <UL>
        <LI>
          <Strong>Off-center, toward the entrance.</Strong> Put the camera roughly 1/3 of
          the way into the room from the doorway. The opposite wall becomes the focal point
          and the room reads as bigger.
        </LI>
        <LI>
          <Strong>Frame the best feature.</Strong> If the kitchen has an island, place the
          camera so the island is in the foreground when the viewer first arrives. If the
          living room has a fireplace, center the opening view on it.
        </LI>
        <LI>
          <Strong>Avoid tight corners.</Strong> Nothing makes a small room look smaller than
          a fisheye-warped corner cabinet looming at you.
        </LI>
      </UL>

      <H2 id="exterior">Exterior shots</H2>
      <P>
        Two exterior scenes are usually enough: front yard from the street, and back yard
        from a patio if there is one. A few things specific to outdoors:
      </P>
      <UL>
        <LI>Move the camera away from cars in the driveway — they date the listing fast.</LI>
        <LI>
          Avoid shooting directly into the sun. The lens flare in 360 cameras is brutal because
          the sun is always somewhere in the frame.
        </LI>
        <LI>
          Cloudy days are great for exteriors — soft, even lighting, no harsh shadows.
        </LI>
      </UL>

      <H2 id="checklist">The 60-second pre-shot checklist</H2>
      <Checklist
        items={[
          "Lights on, blinds open",
          "Doors to adjacent rooms open",
          "Counters and surfaces cleared",
          "Camera at ~5'6″ on monopod, level",
          "HDR enabled if the room has a window",
          "Remote in hand, you're standing where you'll be hidden",
          "One deep breath, then shutter",
        ]}
      />

      <H2 id="next">What's next</H2>
      <P>
        Once you've captured the photos, you need to get them off the camera in the right
        format. <A href="/guide/exporting-equirectangular">The next chapter</A> covers
        exporting equirectangular JPGs from each major camera — including the
        Insta360-specific gotcha that catches almost everyone the first time.
      </P>
    </>
  );
}
