# Owner-authorized live demo events

Owner explicitly approved creating the six labeled events on live keepitup.social. They were created through normal authenticated production APIs, using a separate synthetic adult DEMO Test Host. No real member account was modified; no fake participants, acceptance, attendance or reviews were created. Registration is a synthetic test fixture, not evidence of a real consenting customer. This host and these events must be excluded from customer and supply metrics.

All descriptions state that the events are fictional and nobody should travel. Public area is Demo area - North, Bucharest; private meeting details are fictional and have no coordinates. Existing authorization and discovery eligibility rules still apply. English is the event language, ages 18–100, dates September 15–20 at 19:00 Europe/Bucharest.

| Event | Production ID |
| --- | --- |
| DEMO - Easy evening run | a01ba962-cc5f-4f4a-a42f-83429368d84d |
| DEMO - Friendly tennis doubles | fee224b2-12da-4cf2-aa6f-c711fb304728 |
| DEMO - First padel rally | a898744f-4c75-4b70-a2f3-94480a79b3fa |
| DEMO - Weekend walking crew | e4b3bd52-60b6-459c-aee8-2ffff18a8e2e |
| DEMO - Casual basketball | c5c445c5-7732-485b-96a7-9876e3276ead |
| DEMO - Advanced tennis practice | 9f1f5987-2179-4f92-8fb8-4b26c428f576 |

Verified all six public invitations return successfully with their demo area, and authenticated detail pages contain the correct DEMO title. No claim that every member is eligible: account language, filters, time, blocks and capacity still apply. The synthetic host's own discovery excludes its own events as designed; use another eligible account for discovery/request testing. No join request was sent during creation.

`qa/demo-events.mjs` validates payloads before submission. `qa/publish-demo-events.mjs --apply-live-demo` requires explicit authorization and uses an ignored private receipt to skip already-created fixture keys. An uncertain POST leaves a pending marker and blocks retry to avoid duplicates. Initial readback expected titles on public previews, which expose sport/area instead; corrected readback checked the appropriate public area and authenticated title without creating duplicates. API creation receipts and synthetic-host credentials remain in ignored `qa/artifacts/live-demo-events.json`.

The Vercel environment export did not provide a usable database value. Creation used the live application API, not direct database access. No deployment, schema migration, external email, paid service or billing change occurred. Future removal should target these exact IDs after owner testing; do not delete unrelated events or members.
