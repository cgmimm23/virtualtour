import { A, Callout, H2, H3, KeyValue, Lead, LI, OL, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        Uploading is the most automated part of making a tour, but a few things are worth
        knowing — what happens in the background, why a scene might briefly look blurry,
        and how to recover when something gets stuck.
      </Lead>

      <H2 id="how-to-upload">How to upload</H2>
      <OL>
        <LI>Open your tour in the editor.</LI>
        <LI>Click <Strong>Add scenes</Strong> in the sidebar (or drag a folder onto the editor).</LI>
        <LI>Select your equirectangular JPGs. You can drop the whole folder.</LI>
        <LI>Each scene appears in the sidebar with a "processing" indicator.</LI>
        <LI>When the indicator turns green, the scene is ready to view and edit.</LI>
      </OL>
      <Callout tone="info" title="Direct-to-storage uploads">
        Files upload directly from your browser to our storage layer, not through our app
        servers. That's why you can drop 20 photos at once without timeouts — and why your
        upload speed is bottlenecked by your internet connection, not our infrastructure.
      </Callout>

      <H2 id="what-happens-next">What happens behind the indicator</H2>
      <P>
        When a scene says "processing" we're doing a few things:
      </P>
      <OL>
        <LI>
          <Strong>Validating the file.</Strong> We check it's a 2:1 JPG and reject anything
          that isn't (this is where a "Free Capture" Insta360 export gets caught — see{" "}
          <A href="/guide/exporting-equirectangular">Exporting equirectangular images</A>).
        </LI>
        <LI>
          <Strong>Tiling.</Strong> Spherical viewers don't load the whole equirectangular
          image — they load small "tiles" of the cube faces at the resolution you're
          currently zoomed to. We pre-generate four resolution levels per scene so the viewer
          stays sharp from a thumbnail to a full-screen close-up.
        </LI>
        <LI>
          <Strong>Compressing and uploading the tiles to the CDN.</Strong> A typical scene
          becomes ~200 small files served from edge locations, so even mobile viewers in
          spotty connections get something on screen within a second.
        </LI>
        <LI>
          <Strong>Generating a thumbnail</Strong> for the scene picker.
        </LI>
      </OL>

      <H2 id="how-long">How long does it take?</H2>
      <KeyValue
        items={[
          { k: "Per scene (5.7K)", v: "~10–20 seconds after upload completes" },
          { k: "Per scene (8K)", v: "~25–40 seconds" },
          { k: "Whole 12-scene tour", v: "Usually ready within 3 minutes of upload" },
          { k: "First few seconds in viewer", v: "May appear soft while the highest-res tiles fetch — that's normal" },
        ]}
      />

      <H2 id="if-stuck">If a scene gets stuck</H2>
      <P>
        99% of the time processing finishes within a minute. If a scene is still spinning
        after 5 minutes, the most likely cause is a malformed file — usually a JPG that
        isn't actually equirectangular, or one that exceeds our 50 MB ceiling.
      </P>
      <H3 id="diagnose">Diagnose</H3>
      <UL>
        <LI>
          <Strong>Open the file on your computer</Strong> and check its dimensions. Width
          should be exactly 2× height (e.g. 5760×2880). If it's 4:3 or some other ratio,
          re-export from the camera app and choose the spherical/equirectangular option.
        </LI>
        <LI>
          <Strong>File size over 50 MB?</Strong> Re-export at 5.7K instead of 11K, or save
          at JPG quality 85 instead of 100. We don't need a magazine print — we need a
          web-fast tour.
        </LI>
        <LI>
          <Strong>Is the JPG actually a JPG?</Strong> Some camera apps export with a{" "}
          <code>.jpg</code> extension but a different internal format. Open it in a normal
          photo viewer first to confirm.
        </LI>
      </UL>
      <H3 id="fix">Fix</H3>
      <P>
        Delete the stuck scene from the sidebar (right-click → delete) and re-upload the
        corrected file. The scene's hotspots will be lost, but a stuck scene wasn't useful
        anyway. If the same file fails twice with no obvious problem, get in touch — we'd
        rather hear about it.
      </P>

      <H2 id="upload-order">Upload order matters (a little)</H2>
      <P>
        New scenes append to the end of the sidebar in the order they finish processing —
        which isn't always the order you uploaded them, because larger files take longer.
      </P>
      <P>
        After the dust settles, drag scenes in the sidebar to put them in the order you want
        viewers to walk through. The first scene in the list becomes the default cover scene
        unless you explicitly mark another with the star icon.
      </P>
      <Callout tone="tip" title="Set the cover scene last">
        Once you've placed your hotspots, pick whichever scene best represents the listing
        as the cover — usually the front exterior or the foyer. That's the image used as
        the social-share preview when someone pastes your tour URL into an SMS or email.
      </Callout>

      <H2 id="replacing">Replacing a scene without losing hotspots</H2>
      <P>
        Took a better shot of the kitchen? Right-click the scene → <Strong>Replace photo</Strong>.
        Hotspots stay where they were placed (in spherical coordinates), so as long as the
        new shot is from approximately the same camera position, doorways will still point
        at the right doors.
      </P>
      <P>
        If you moved the camera substantially between shots, you'll need to nudge the
        hotspots — but it's still faster than starting over.
      </P>

      <H2 id="next">What's next</H2>
      <P>
        Photos uploaded, scenes ordered. Now the part where a tour stops being a slideshow
        and becomes a navigable space:{" "}
        <A href="/guide/hotspots-explained">hotspots</A>.
      </P>
    </>
  );
}
