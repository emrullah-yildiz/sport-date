# Three ways to play: KeepItUp concept comparison

## Delivered scope

The September 25 owner-approved first milestone is an interactive comparison, before selecting or applying a production redesign. `/concepts` runs only under the local Next development server; production returns not-found. Existing landing, signup, member/profile access and production APIs are unchanged by this concept work. All photos, people, activity records, places available and progress are explicitly fictional.

Start with `npm.cmd run dev --workspace @sport-date/web -- --hostname 127.0.0.1 --port 3015`, then open `http://127.0.0.1:3015/concepts`.

The studio lets the reviewer switch themes without leaving the current journey, preview a 390px mobile container, inspect missing-photo/long-name/empty states, and download local comparison notes. Notes remain in page memory and are lost on refresh unless downloaded. Nothing is submitted, registered, purchased, or recorded as customer evidence.

## Art directions

| Direction | Visual language | Interaction and progression |
| --- | --- | --- |
| Player Cards | Warm paper `#F4F2E9`, ink `#19272A`, blue `#315AF1`, lime `#D2F45A`. Regular Barlow Condensed display with italic editorial accent, framed photography, offset card backs, small printed details. | Photo carousel with arrows, touch and keyboard; sport selection changes the self-described attributes; card flips to interests. Completed fictional activities unlock first-edition, colour-shift, court-line and holographic finishes that can be applied to the card. |
| Clubhouse | Cream `#FFF9ED`, forest `#293D32`, cherry `#B93735`, lavender `#DED3EE`. Georgia editorial headings, portrait collage, handwritten notes and perforated invitations. | Open a club pass from the portrait, choose a paper event ticket, collect private participation stamps. |
| Play Map | Midnight `#161C29`, chalk `#EEF0E9`, cyan `#A4E9DC`, coral `#F3A08F`. Regular geometric text, schematic courts and a dotted activity path. | Browse accessible event destinations or switch to List. Player panels and private milestone nodes carry the visual language through the journey. The map is explicitly schematic, with no coordinates or geographic tracking. |

All use the same Mara, age 28, and the same tennis, running and padel plans. Essential event labels are readable at mobile sizes; body copy is 16px, heading weights mostly 400 and controls 400–500. Repeated security and explanatory paragraphs are absent from the main cards. Contextual request information remains short; report/block entry points appear in event details as concept-only actions.

## Behavior and interfaces

- Client-only fixture state; no authentication, database, API, analytics, third-party calls or browser storage. Theme-scoped CSS modules leave existing product typography unchanged.
- The photo carousel wraps in both directions, supports horizontal touch gestures without blocking vertical scrolling, and falls back to a monogram if a photo is unavailable. Event context selects the relevant sport.
- Request and participation are separate: explicit request → pending; external preview controls simulate host acceptance and subsequent attendance. Invalid transitions do nothing. Repeating attendance cannot increase progress again for the same event.
- Participation stages remain separate from self-described sport skill. Default fixture history is two attended activities; each distinct completed demo event adds one. The outer studio can preview 0/1/3/6/10 stages. Locked finishes cannot be applied; reducing preview progress hides an unavailable finish.
- Native buttons, visible focus, local navigation focus restoration, accessible state labels, and reduced-motion support are included. Mobile profile puts the card before its explanatory introduction.
- Generated photo sources and exact prompts: `apps/web/src/components/concepts/assets/ASSETS.md`. Built-in Image Generation only; no paid API fallback. The images depict no actual members.

## Five-person comparison protocol

The owner introduces five consenting adults and one potential host. No recruitment or messages are sent by this preview. Use the same tasks for each direction and rotate presentation order across testers: Cards/Clubhouse/Map, Clubhouse/Map/Cards, Map/Cards/Clubhouse, Cards/Map/Clubhouse, Clubhouse/Cards/Map.

1. Find the Saturday tennis plan and explain its time, broad area and available places.
2. Open Mara's profile, view another photo, and describe her tennis level versus participation progress.
3. Request a place and explain whether it has been accepted. Then use the clearly separate preview controls to examine acceptance and attendance.
4. Find the personal progress surface and explain what has been earned. For Cards, apply an available finish.
5. Rate fun and clarity 1–5, choose a direction, and identify one thing to remove or simplify. Download notes locally; share only consented, minimized observations with the coordinator.

Record assistance, confusion and completion, not just preferences. Initial criterion: four of five can find and understand the request journey without coaching. This is a small formative test, not proof of conversion improvement or product-market fit.

## Verification and next stage

Passed: nine theme/viewport browser cases plus the focused cosmetic check, five route/data Vitest tests, all workspace typechecks, scoped lint, and a production build. A local production HTTP smoke also confirmed that `/concepts` returns 404 with noindex.

Repeat browser checks with `node apps/web/qa/concepts.mjs` (requires the loopback development server). Browser QA covers all three themes at 1280/390/320, desktop mobile-preview containers, photo navigation, filters, empty/missing/long-name states, request transitions, progression, local notes, motion and overflow. Network guards reject API, external-host and write-method requests; the verified run recorded zero violations and zero browser errors. QA screenshots and results are ignored under `apps/web/qa/artifacts/concepts`.

The owner selects a direction after comparing the working prototypes. Then consolidate the chosen tokens and components and implement public invitation previews, authentication return context, four-stage signup and simplified existing feedback intake. Preserve adult/consent/location/access rules. Production release remains separately scoped. Actual attendance, 14-day return, selected paid benefit, settled payment and renewal remain later evidence gates—not results of this design exercise.
