import { A, Callout, H2, H3, KeyValue, Lead, LI, P, Strong, UL } from "./components";

export function Article() {
  return (
    <>
      <Lead>
        After publishing, the tour earns its keep one of two ways: by giving you data you
        can act on, and by quietly working in the background without breaking. This chapter
        is about both — the analytics that actually matter and the small set of issues
        that account for 90% of "something's wrong" support requests.
      </Lead>

      <H2 id="metrics-that-matter">Metrics that matter</H2>
      <P>
        Every published tour has a dashboard with the following:
      </P>
      <KeyValue
        items={[
          { k: "Unique viewers", v: "Distinct sessions over the time window. The vanity metric — feels good but doesn't predict outcomes." },
          { k: "Average scenes viewed", v: "The real engagement signal. Under 4 means people are bouncing; over 8 means they're invested." },
          { k: "Median session duration", v: "Above 90 seconds is healthy. Above 3 minutes means you have a strong listing." },
          { k: "Leads captured", v: "What you actually care about. Track per tour and as a percentage of unique viewers." },
          { k: "Conversion rate (leads / viewers)", v: "Healthy range 5–15%. Below 3% means the gate copy or trigger needs work; above 20% suggests the gate is too aggressive." },
          { k: "Top scenes by dwell time", v: "Which rooms held attention. Use this to inform the listing description and your in-person showings." },
          { k: "Drop-off scenes", v: "Where people leave. If the same scene loses 40% of viewers, something's wrong with that scene (often a missing back-doorway hotspot)." },
        ]}
      />

      <H2 id="what-to-act-on">What to actually act on</H2>
      <P>
        The point of analytics isn't to look at it. It's to change something next time.
      </P>
      <UL>
        <LI>
          <Strong>Low scenes-per-session?</Strong> Your opening view on the cover scene
          probably doesn't entice. Try a more dramatic FOV or a different yaw.
        </LI>
        <LI>
          <Strong>High drop-off on scene 3?</Strong> Check that scene's hotspots — viewers
          probably can't find the next room. Add an arrow.
        </LI>
        <LI>
          <Strong>Lots of viewers, no leads?</Strong> The gate is firing but conversions
          are low. Try requiring fewer fields, softer copy, or moving the trigger from "3
          scenes" to "after the kitchen".
        </LI>
        <LI>
          <Strong>Lots of leads, no closes?</Strong> The gate copy is probably overselling.
          Tighten the framing — "see the floor plan" attracts more browsers than buyers.
        </LI>
        <LI>
          <Strong>One scene gets all the dwell time?</Strong> That's the room to lead with
          in your verbal pitch. Mention it first when buyers call.
        </LI>
      </UL>

      <H2 id="troubleshooting">Troubleshooting</H2>
      <P>
        The five issues that come up most often, and the fixes:
      </P>

      <H3 id="blurry">"My tour looks blurry"</H3>
      <P>
        Almost always one of:
      </P>
      <UL>
        <LI>
          <Strong>The original photo was below 5.7K.</Strong> 4K equirect renders soft on
          modern phones. Re-shoot or re-export at higher resolution.
        </LI>
        <LI>
          <Strong>Slow connection during the first second.</Strong> The viewer loads
          low-res tiles first while higher-res ones download. On 3G this delay is visible.
          Not much to do — the viewer is doing the right thing.
        </LI>
        <LI>
          <Strong>Heavy JPG compression.</Strong> Some camera apps default to high
          compression to save space. Re-export at quality 90+.
        </LI>
      </UL>

      <H3 id="missing-scene">"A scene is missing in the viewer"</H3>
      <P>
        Check the scene's status in the editor — it might be stuck in "processing" (see{" "}
        <A href="/guide/uploading-your-photos">Uploading your photos</A> for the fix). If
        the status is "ready" but the scene doesn't appear in the published tour, make
        sure the tour itself is published and the scene isn't marked as draft-only.
      </P>

      <H3 id="mobile-gyro">"Gyro look-around doesn't work on iPhone"</H3>
      <P>
        Safari requires explicit user permission for gyro access since iOS 13. The Tourly
        viewer prompts for it on first interaction — if the user dismissed the prompt,
        they need to clear the site's permission in Settings → Safari → Advanced →
        Website Data → tourly.app to get prompted again. This is annoying and there's no
        workaround on Apple's side.
      </P>

      <H3 id="hotspot-misplaced">"My hotspot is in the wrong place"</H3>
      <P>
        In the editor with Edit mode on, drag the hotspot to nudge it. Hotspot positions
        are stored in spherical coordinates (yaw, pitch in radians), so they survive
        scene re-uploads as long as you don't move the camera position. If you{" "}
        <em>did</em> move the camera between shots, you'll need to re-place each hotspot.
      </P>

      <H3 id="lead-no-email">"A lead came in but I didn't get the email"</H3>
      <P>
        Check:
      </P>
      <UL>
        <LI>Spam folder — first emails from a new sender often land there. Mark as "not spam".</LI>
        <LI>
          The notification email field in your team settings — make sure it's set to your
          working address, not a stale one.
        </LI>
        <LI>
          Your CRM webhook (if connected) — sometimes the lead lands there silently and
          the email is suppressed. Check the lead in the dashboard.
        </LI>
      </UL>

      <Callout tone="info" title="When in doubt, just ask">
        If something's broken and the fix isn't obvious from the dashboard, email{" "}
        <Strong>support@tourly.app</Strong> with the tour URL. We respond fast — solo
        agents and one-person support is the founder. Real names, real replies.
      </Callout>

      <H2 id="end">That's the whole guide</H2>
      <P>
        You now know enough to ship a virtual tour from a fresh listing in about an hour
        and have it actually generate leads. Everything else is iteration: shoot more
        listings, watch the analytics, tweak the gate, ship again.
      </P>
      <P>
        <A href="/guide">Back to all chapters →</A>
      </P>
    </>
  );
}
