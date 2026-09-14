# One plan, one request: 20-second product demo

Status: production brief ready; video not rendered, approved, scheduled or published. Prepared September 14, 2026. Owner publication approval remains required.

## Purpose and audience

Help an adult who has never heard of KeepItUp explain what it does: discover a small sports activity, read the plan and request a place; the host decides. The tension is wanting to meet people without having to invent an opening line. The single idea is **start with something to do together**.

Primary format: one 20-second vertical Instagram Reel, 1080 × 1920. Use the same master for an owner-approved TikTok adaptation only after checking that account's preview and caption. This is a building-in-public product explanation, not an invitation to a real event. Do not generate more variants until this one has comprehension evidence.

This follows the existing owner preference for clear, ordered how-it-works content and the stranger test in `owner-taste-rules.md`. Historical automatic scheduling language in that document does not authorize publication. It also follows `social/strategy-2026-07.md` and the batch-14 emphasis on product identity; earlier performance numbers are not current evidence.

## Capture source and release truth

Reuse the actual interactive example in `/landing#try-it`, captured signed out in a local browser. Select **Running**, then **A crew**. The example is **Good company. Easy kilometres.**, with a fictional host and approximate example area. No stock people, generated testimonials, new logo, live member data or real event requests are needed.

The relevant source is `apps/web/src/components/landing/LandingExperience.tsx` and `demo.ts`. Their current contents match the approved release `d7064b7` when checked during this task. `docs/operations/release-2026-09-14.md` records that release's production verification. This is source/release evidence, not a new live UI verification; recheck the public example before recording a publishable final cut.

Later local signup, joining, discovery and chat safety improvements are **unreleased** and excluded from this script. If a producer substitutes those screens, label them visibly **Local preview · not yet released** and obtain approval for a preview post or wait for their approved deployment. Do not silently intercut them as the current production experience.

Keep **Example activity · nothing is sent** visible throughout screen-recording shots, including when zooming or cropping. Preserve the UI's fictional-host disclosure whenever the host is shown. Use the existing KeepItUp mark, charcoal surfaces and green actions; reuse the existing court illustration in the opening rather than unrelated imagery.

## Exact timeline

| Time | Picture and action | On-screen text | Voiceover / subtitles |
|---|---|---|---|
| 0–4 s | Existing KeepItUp mark and illustrated court; transition to the example's Running selection. | **Meet people through sport.** Smaller: **Adults 18+** | “KeepItUp helps adults meet through small sports activities.” |
| 4–8 s | In the interactive example, tap Running and A crew. Hold the activity title, example area, time and group size long enough to read. | **1. Discover an activity** | “Find a plan that feels like you.” |
| 8–12 s | Tap the actual **Explore this example** button. Show **A little more about the plan**, easy pace and what to bring. Keep the meeting-point-hidden text visible. | **2. Read the plan** | “Check the pace and what to bring.” |
| 12–15 s | Tap the actual **Try sending a demo request** button once. Do not show any network send or real booking animation. | **3. Request a place** | “Then ask to join.” |
| 15–18 s | Hold the actual requested-state heading: **Demo request sent. You’re not booked yet.** Show its explanation and the cancel option. Stop here; do not simulate acceptance. | **Pending ≠ booked. The host decides.** | “The host decides. You’re not booked yet.” |
| 18–20 s | Clean end card with existing mark and URL. No countdown, confetti or fake attendance. | **Try the example** / **keepitup.social** / **Fictional activity · adults 18+** | “Try the example.” |

The narration is 36 words, paced across the shot durations. Record a calm read, with a short pause before “You’re not booked yet.” No music is required. If adding music, use a track with verified rights for the intended account and channel; an assumed platform license is insufficient.

“Discover” describes the first step of the teaching example here, not a recording of the signed-in `/discover` inventory. Keep the actual UI button labels intact. “Pending” is an editorial explanation; the recorded UI's requested-state heading remains the exact wording above. No exact meeting point appears in this cut.

## Caption, cover and accessibility

**Caption:** KeepItUp helps adults meet for dating, friendship or a new crew through small local sports activities. Choose an activity, read the plan and ask to join. The host reviews your request; it is not a booking. This video shows a fictional example—nothing is sent. Try it at keepitup.social.

**Cover:** Existing wordmark above **How KeepItUp works**, with a readable sample activity card and **Example activity** label. Avoid invented faces, star ratings, member counts and claims of available sessions nearby.

**Alt text / descriptive transcript:** A screen recording of KeepItUp's fictional sports activity example. Running and A crew are selected. The viewer opens a sample running plan, checks its details and tries a demo request. The screen explains that the request is not a booking and a real host would decide. The exact meeting point stays hidden. The final card invites adults to try the example at keepitup.social.

Burn in the exact voiceover as subtitles, at most two short lines at once. Retain the visual description above in the review packet or accessible post description where supported; it does not replace subtitles. Keep step labels and the example disclosure clear of captions and platform controls. Check the actual upload preview rather than assuming a universal safe area. Use readable high-contrast text, restrained cuts, no flashing, and no dependence on sound or green color alone to explain state.

## Production checks and publication prerequisites

1. Capture with a signed-out, empty browser profile using only the in-memory demo. Verify no real account, notification, address, member image, browser credential or personal bookmark appears. Do not click signup or issue a real join request. Record the local URL and source commit privately in the asset log; do not show local filesystem details in the video.
2. Render one 20-second master and inspect it at phone size with sound off. Confirm the request ends pending, the disclosure survives every crop, the exact meeting point never appears, and the link/CTA opens the real public example. This brief has not yet produced or inspected a video artifact.
3. Recheck the public landing and its example against the captured source. If materially different, rerecord from the current approved release or label the entire cut as an unreleased local preview and obtain explicit approval for that wording.
4. Obtain a narrow owner decision approving this exact rendered video, caption, account, channel and publishing time. Existing pilot authorization, support-mail setup, historical social rules and HQ reporting authorization do not authorize this post, DMs, paid promotion or replies.
5. Confirm the selected official social account is accessible and any added audio/font assets have usable rights. No paid tool or new account is necessary for this brief. Publish only after the scoped approval; do not include host outreach, unsolicited distribution or spending.

## Evidence to collect after approval

Before broader distribution, use the final cut in an owner-authorized comprehension check with three unfamiliar adults: What is KeepItUp? Is the request a confirmed place? Is this a real activity you can attend? Desired first-pass outcome: all three understand sports-based connection, host review and the fictional example. This is an editorial acceptance target, not research already completed or statistically reliable conversion evidence.

If approved for publication, record the actual post link, publication time and any available completion/watch-through measures as observations. Review responses for confusion about booking or live activity availability. Do not equate views with unique users, attendance or revenue. No automated replies, outreach or tracking changes are authorized by this brief.

## Verification performed

Read the current demo model, component labels, source comparison against `d7064b7`, release record, existing taste rules, growth skill and batch-14 draft context. Confirmed the requested-state copy and hidden meeting-point behavior in the source. This documentation-only task changes no app behavior and requires no new app tests; recording, render inspection, participant feedback and publication remain outstanding.
