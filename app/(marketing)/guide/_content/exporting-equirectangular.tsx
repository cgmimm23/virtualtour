import { A, Callout, Code, H2, H3, KeyValue, Lead, LI, OL, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        Tourly accepts a single thing: a 2:1 equirectangular JPG per scene. Every modern
        360 camera can produce one. The trick is knowing the right export option in each
        camera's app — some of them default to a format that <em>looks</em> right but breaks
        spherical playback in subtle ways.
      </Lead>

      <H2 id="what-equirectangular-is">What "equirectangular" actually means</H2>
      <P>
        An equirectangular image is the unwrapping of a sphere onto a flat rectangle, the
        same way a world map unwraps the globe. The horizon is the middle row of pixels, the
        top is what's directly above the camera, and the bottom is what's directly below.
        Width is always exactly 2× height — that 2:1 ratio is what spherical viewers
        (Marzipano, Pannellum, Three.js, your Tourly viewer) expect.
      </P>
      <KeyValue
        items={[
          { k: "Aspect ratio", v: <>Exactly 2:1 (e.g. 5760×2880, 7680×3840)</> },
          { k: "Format", v: <>JPG. PNG works but files are 5× larger for no quality gain.</> },
          { k: "Color space", v: <>sRGB. AdobeRGB will look desaturated in browsers.</> },
          { k: "File size", v: <>Aim for 5–15 MB. Anything bigger is over-detail; smaller is usually under-detail.</> },
        ]}
      />

      <H2 id="insta360">Insta360 (X3, X4, One X2)</H2>
      <P>
        This is where most agents trip. Insta360 cameras shoot a proprietary{" "}
        <Code>.insp</Code> or <Code>.insv</Code> file by default, which is <em>not</em>{" "}
        equirectangular until you export it.
      </P>
      <Callout tone="dont" title="Don't use Free Capture">
        In the Insta360 app, "Free Capture" exports a flat 2D photo with the framing you
        chose — useful for social media, useless for a virtual tour. It's not a sphere
        anymore.
      </Callout>
      <Callout tone="do" title="Do export as 360 Photo at 5.7K Equirectangular">
        Open your photo in the Insta360 app → tap the export icon → choose{" "}
        <Strong>360 Photo</Strong> → format <Strong>JPG</Strong> → resolution{" "}
        <Strong>5.7K (5760×2880)</Strong>. Save to camera roll or AirDrop to your computer.
      </Callout>
      <P>
        On the desktop Insta360 Studio app the same option lives under{" "}
        <Code>Export → Spherical → JPG</Code>. Make sure "Spherical" is selected and not
        "Flat" or "Tiny Planet".
      </P>

      <H3 id="insta360-batch">Exporting a whole shoot at once</H3>
      <OL>
        <LI>Plug the camera into your computer via USB-C.</LI>
        <LI>Open Insta360 Studio.</LI>
        <LI>Drag all the <Code>.insp</Code> files into the queue.</LI>
        <LI>
          Set defaults: 360 Photo, JPG, 5760×2880, sRGB. Apply to all.
        </LI>
        <LI>Hit export. ~10 seconds per photo on a modern laptop.</LI>
      </OL>

      <H2 id="ricoh">Ricoh Theta (Z1, X, SC2)</H2>
      <P>
        Theta cameras shoot equirectangular by default. Plug the camera in or pair via Wi-Fi
        in the Theta app, and the photos come off the device already in the right format.
      </P>
      <Callout tone="info" title="Theta orientation">
        The Z1 and X have built-in horizon levelling that's enabled by default — keep it on.
        It auto-rotates the photo so vertical lines stay vertical even if you held the camera
        slightly tilted. Without it, your living room walls will lean.
      </Callout>
      <P>
        On the Z1 specifically, you can also shoot in DNG (RAW) mode. Skip this for tour
        work — the JPG processing pipeline is excellent and the workflow saving isn't worth
        the extra step.
      </P>

      <H2 id="gopro">GoPro Max</H2>
      <P>
        The GoPro Max shoots a proprietary <Code>.360</Code> file that needs reprojection,
        similar to Insta360. The flow:
      </P>
      <OL>
        <LI>Open the photo in GoPro Player on desktop.</LI>
        <LI>Choose <Code>Export → JPG</Code> with the <Strong>360</Strong> projection (not "Flat" or "Linear").</LI>
        <LI>Resolution will cap at 5.6K — that's the camera's max.</LI>
      </OL>
      <P>
        The Max is fine but its stitching is noticeably softer than the Insta360 X-series.
        Workable but not best-in-class.
      </P>

      <H2 id="iphone">iPhone (panorama and 360 apps)</H2>
      <P>
        The native iOS Camera app's "Pano" mode does <em>not</em> produce equirectangular
        output — it's a flat strip with limited vertical coverage. Tourly will reject it.
      </P>
      <P>
        For phone-only shooting, use a dedicated app:
      </P>
      <UL>
        <LI>
          <Strong>Insta360's free app</Strong> with the optional X-series remote shoots true
          equirectangular if you pair a 360 camera. Without one, the in-app "single phone
          360" mode walks you through a manual rotation and stitches the result. Quality is
          mediocre.
        </LI>
        <LI>
          <Strong>P360 Camera (iOS)</Strong> uses the wide lens and gyro to build an
          equirectangular image. Decent for outdoor/test shots.
        </LI>
      </UL>

      <H2 id="naming">Naming files so future-you doesn't suffer</H2>
      <P>
        The tour editor sorts scenes by upload order, but you'll be uploading 12 files at
        once and it's easy to lose track. Rename before uploading:
      </P>
      <UL>
        <LI><Code>01-front-exterior.jpg</Code></LI>
        <LI><Code>02-foyer.jpg</Code></LI>
        <LI><Code>03-living-room.jpg</Code></LI>
        <LI><Code>04-kitchen.jpg</Code></LI>
      </UL>
      <P>
        The <Code>01-</Code> prefix is what makes them sort correctly. Without it macOS and
        Windows both put <Code>10-master-bedroom</Code> right after <Code>1-foyer</Code>.
      </P>

      <H2 id="next">What's next</H2>
      <P>
        Now you have a clean folder of equirectangular JPGs, named in the order you want
        them to appear. The last shooting-side decision is which rooms to include and in
        what order — covered in <A href="/guide/planning-a-tour">Planning a tour</A>.
      </P>
    </>
  );
}
