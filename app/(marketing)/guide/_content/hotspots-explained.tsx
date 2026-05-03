import { A, Callout, H2, H3, KeyValue, Lead, LI, OL, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        Hotspots are the difference between a slideshow and a tour. They're the clickable
        markers that take a viewer from the foyer to the kitchen, open a panel describing
        the renovation history of a fireplace, or fire off an external link to a floor
        plan. There are four types in Tourly. Most tours only need one of them.
      </Lead>

      <H2 id="four-types">The four types</H2>
      <KeyValue
        items={[
          { k: "Scene link", v: "Jump to another scene. The doorway hotspot. 90% of what you'll place." },
          { k: "Info", v: "Open a small panel with a title and a paragraph of text. For features that need explaining." },
          { k: "URL", v: "Open an external link in a new tab. Floor plans, neighborhood guides, listing PDFs." },
          { k: "Media", v: "Embed an image or short video inline (e.g. before/after renovation, drone footage)." },
        ]}
      />

      <H2 id="scene-link">Scene link hotspots</H2>
      <P>
        These are doorways, hallways, stair openings — anything a viewer would walk through
        in real life. The whole feel of a tour depends on these being placed cleanly.
      </P>
      <H3 id="placing">Placing a scene link</H3>
      <OL>
        <LI>Open the scene in the editor and click <Strong>Editing</Strong>.</LI>
        <LI>
          Pan the view so the doorway you want to link is in the middle of the screen, then
          click on the doorway. A new hotspot appears.
        </LI>
        <LI>
          In the side panel, set the type to <Strong>Scene link</Strong> and pick the target
          scene from the dropdown.
        </LI>
        <LI>Optionally rename the hotspot (e.g. "Living room") — this becomes the tooltip on hover.</LI>
      </OL>

      <H3 id="placement-rules">Placement rules that make a tour feel right</H3>
      <UL>
        <LI>
          <Strong>Place hotspots at the floor</Strong>, not at chest height. Buyers' brains
          interpret a low marker as "I'd walk there" and a high marker as "I'd look at
          that". You want the former.
        </LI>
        <LI>
          <Strong>One hotspot per actual doorway.</Strong> Don't add a "to the kitchen"
          marker on the wall <em>next</em> to the kitchen door — confusing and looks lazy.
        </LI>
        <LI>
          <Strong>Always place a hotspot back to where you came from.</Strong> The cardinal
          sin of bad tours: a viewer enters the bedroom and there's no way back to the
          hallway except the browser back button.
        </LI>
        <LI>
          <Strong>For the front yard:</Strong> place a hotspot pointing at the front door
          that links to the foyer. For the foyer: a hotspot pointing back through the door
          that links to the front yard.
        </LI>
      </UL>
      <Callout tone="tip" title="Auto-link doorways">
        If you've ordered scenes in walk-through order in the sidebar, hit the{" "}
        <Strong>Auto-link →</Strong> button in the editor toolbar to add a "next" doorway
        to every scene in one click. Use <Strong>Auto-link ⇄</Strong> for next + previous.
        You'll still want to nudge a few placements, but it gets you 80% of the way for
        free.
      </Callout>

      <H2 id="info">Info hotspots</H2>
      <P>
        An info hotspot opens a small modal with a title and a body paragraph. Use them
        sparingly — every info hotspot is a thing the viewer has to read, and reading
        breaks immersion.
      </P>
      <P>
        Good uses:
      </P>
      <UL>
        <LI>"Vaulted ceiling — restored from original 1920s timber"</LI>
        <LI>"New roof installed 2024, transferable warranty"</LI>
        <LI>"Quartz counters, 2023 renovation"</LI>
        <LI>"Soundproofed home office wall — see disclosures"</LI>
      </UL>
      <P>
        Bad uses:
      </P>
      <UL>
        <LI>Anything obvious from the photo ("This is the kitchen")</LI>
        <LI>Long paragraphs of marketing copy</LI>
        <LI>More than 3 info hotspots per scene — viewers stop opening them</LI>
      </UL>

      <H2 id="url">URL hotspots</H2>
      <P>
        URL hotspots open an external link in a new tab. The honest use case is narrow:
      </P>
      <UL>
        <LI>A PDF of the floor plan, hosted on your site or a service like Cubicasa.</LI>
        <LI>The MLS listing page (so a viewer can save it).</LI>
        <LI>A Matterport-style 3D model of one specific room, if you happened to scan it.</LI>
        <LI>A school district info page (placed near a window facing the school).</LI>
      </UL>
      <Callout tone="warn" title="Every external link is a viewer leaving">
        URL hotspots take the viewer away from your tour. That's fine when the destination
        adds value (floor plan), bad when it pushes them out of the funnel (a competitor's
        neighborhood guide). Use them when leaving makes the listing more compelling, not
        less.
      </Callout>

      <H2 id="media">Media hotspots</H2>
      <P>
        Media hotspots embed an image or video inline without leaving the tour. Real
        estate uses:
      </P>
      <UL>
        <LI>
          <Strong>Before/after photos</Strong> of a renovated kitchen — viewer sees the
          finished room, clicks the hotspot, sees the before shot in a modal. Powerful.
        </LI>
        <LI>
          <Strong>Drone clip</Strong> placed in an exterior scene, showing the property
          from above.
        </LI>
        <LI>
          <Strong>Stage-vs-empty</Strong> for vacant homes — show what the room looks like
          with furniture in it.
        </LI>
        <LI>
          <Strong>Time-of-day comparisons</Strong> — golden-hour photo of the back yard
          embedded in the daytime scene.
        </LI>
      </UL>

      <H2 id="too-many">How many hotspots is too many</H2>
      <P>
        For a typical tour: each scene should have 1–2 scene links (forward, sometimes
        back), and at most 2 other hotspots (info or media). Past that, the screen gets
        cluttered and viewers stop noticing the important ones.
      </P>
      <P>
        Total hotspot count for a 12-scene tour: roughly 20–30. If you find yourself with 60,
        you're overworking it.
      </P>

      <H2 id="copy-paste">Copying hotspots between scenes</H2>
      <P>
        If every scene needs the same "Contact agent" info hotspot in the same position,
        select the hotspot, hit <Strong>⌘C</Strong>, navigate to the next scene, and{" "}
        <Strong>⌘V</Strong>. <Strong>⌘⇧V</Strong> pastes to all scenes at once. The pasted
        copy keeps yaw, pitch, and content but gets a fresh ID — edits to one don't affect
        the others.
      </P>

      <H2 id="next">What's next</H2>
      <P>
        Hotspots placed, navigation works. Next, the small but important detail of what each
        scene looks like the moment a viewer first arrives:{" "}
        <A href="/guide/setting-the-opening-view">setting the opening view</A>.
      </P>
    </>
  );
}
