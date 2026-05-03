import { A, Callout, CompareTable, H2, H3, KeyValue, Lead, LI, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        You don't need an expensive camera to make a great virtual tour, but you do need one
        that produces a clean, well-exposed 2:1 equirectangular JPG with no heavy lens
        distortion at the seams. Here's what's actually worth owning in 2026, and what to
        skip.
      </Lead>

      <H2 id="what-tourly-needs">What Tourly needs from a camera</H2>
      <P>
        Tourly is camera-agnostic. We don't sell hardware, and we don't lock you in. The only
        thing we need from your camera is an <Strong>equirectangular JPG</Strong> — a single
        2:1 ratio image (e.g. 5760×2880) that covers the full sphere. Every modern 360 camera
        produces this with one tap. If it does, it works with Tourly.
      </P>
      <Callout tone="info" title="Resolution sweet spot">
        Aim for at least 5.7K (5760×2880). 4K is acceptable for hallways and exteriors but
        looks soft on a 6.5″ phone in 2026. 8K and 11K are diminishing returns — file size
        triples, perceived sharpness barely budges.
      </Callout>

      <H2 id="recommendations">Recommendations by budget</H2>
      <CompareTable
        columns={["Camera", "Price", "Resolution", "Best for"]}
        rows={[
          [
            <Strong key="ix4">Insta360 X4</Strong>,
            "~$500",
            "8K (downsample to 5.7K)",
            "Most agents, most listings. Best all-rounder.",
          ],
          [
            <Strong key="ix3">Insta360 X3</Strong>,
            "~$350 (used)",
            "5.7K",
            "Same workflow as X4 at lower cost. Still excellent.",
          ],
          [
            <Strong key="ricoh">Ricoh Theta Z1</Strong>,
            "~$900",
            "6.7K",
            "Larger sensor — best in low-light interiors.",
          ],
          [
            <Strong key="ricohx">Ricoh Theta X</Strong>,
            "~$700",
            "5.7K",
            "Has an LCD on the back — useful in bright sun.",
          ],
          [
            <Strong key="gopro">GoPro Max</Strong>,
            "~$400",
            "5.6K",
            "If you already own one. Otherwise pass — better options exist.",
          ],
          [
            <Strong key="iphone">iPhone Pano + 360 app</Strong>,
            "$0",
            "Variable",
            "Try-before-you-buy only. Stitching artifacts are visible.",
          ],
        ]}
      />

      <H2 id="my-pick">If you're buying one camera today</H2>
      <P>
        Buy the <Strong>Insta360 X4</Strong>. It's not a nuanced answer because it doesn't
        need to be:
      </P>
      <UL>
        <LI>One-tap shooting via the app or a tiny remote.</LI>
        <LI>Excellent in-camera stitching — no manual seam fixing in 99% of shots.</LI>
        <LI>Good enough in mixed lighting (which every interior is).</LI>
        <LI>Standard tripod thread, USB-C charging, no proprietary cables to lose.</LI>
        <LI>Massive used market — buy refurbished and save $150.</LI>
      </UL>
      <P>
        The Theta Z1 is technically sharper in dim rooms because of its larger 1″ sensor, but
        you pay almost double, the workflow is fussier, and the difference is invisible on a
        phone screen.
      </P>

      <H2 id="iphone">"Can I just use my iPhone?"</H2>
      <P>
        For exterior shots and a single test tour: yes, with caveats. There are apps
        (Panorama 360, Google Street View's app while it lasted, Insta360's free app paired
        with manual rotation) that produce equirectangular photos from a phone. They work.
      </P>
      <P>
        But: the stitching is uneven, the seams are visible especially indoors with vertical
        lines like door frames, and you'll spend the time you saved on hardware re-shooting.
        The honest recommendation: try one tour with your phone to see if you like the
        format, then buy a real camera before sending anything to a client.
      </P>

      <H2 id="accessories">Accessories that actually matter</H2>
      <KeyValue
        items={[
          {
            k: "Monopod (not tripod)",
            v: "A thin monopod disappears in the photo because you're standing directly under it. Tripod legs splay out and end up in every shot.",
          },
          {
            k: "Bluetooth shutter",
            v: "Lets you stand 10 feet away from the camera so you're not in the frame. The Insta360 GO/X-series remotes are tiny and cheap.",
          },
          {
            k: "Spare batteries",
            v: "A typical 4-bedroom house is 8–12 scenes. One battery handles it; two batteries handle three houses. Don't be the agent who shows up with 18% charge.",
          },
          {
            k: "MicroSD with decent write speed",
            v: "V30 or better. Slow cards bottleneck the camera and you'll see a 'processing' delay between shots that breaks your rhythm.",
          },
        ]}
      />

      <H2 id="dont-buy">What to skip</H2>
      <UL>
        <LI>
          <Strong>Matterport's Pro2/Pro3 cameras.</Strong> Locked to Matterport's hosting,
          $3,000+, requires a subscription, slow capture cycle. If you're using Tourly you
          don't want their hardware tax.
        </LI>
        <LI>
          <Strong>Cheap no-name 360 cameras off Amazon.</Strong> The stitching software is
          where the value is, and the budget brands don't have it. You'll see seams.
        </LI>
        <LI>
          <Strong>DSLR + nodal head + manual stitching.</Strong> This is the Photoshop-era
          way. The image quality is genuinely better, but the time cost is 30× and clients
          can't tell the difference on a phone.
        </LI>
      </UL>

      <H2 id="next">What's next</H2>
      <P>
        With a camera in hand, the next thing to learn is how to actually use it well. Lighting,
        tripod placement, exposure, and how to not be in your own photos —{" "}
        <A href="/guide/shooting-a-360-photo">that's the next chapter</A>.
      </P>
    </>
  );
}
