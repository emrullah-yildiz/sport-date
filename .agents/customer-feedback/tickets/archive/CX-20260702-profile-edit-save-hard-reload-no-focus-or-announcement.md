# CX-20260702-profile-edit-save-hard-reload-no-focus-or-announcement

- Status: `verified`
- Severity: `medium`
- Customer journey: Account & trust — edit my profile (bio, languages, seeking, sports, prompts) and save
- Surface: `web`
- Environment and viewport/device: localhost:3000, Chromium (reduced-motion), 1280 and 375
- Found by: user-sim (experience loop)
- Implementation owner: `unassigned`
- Related tickets: CX-20260701-join-request-commitment-hard-reload-no-confirmation (archived, verified — same anti-pattern, different surface); CX-20260701-host-accept-decline-hard-reload-no-confirmation (archived — same anti-pattern, host surface)

## Customer outcome

As a cautious adult member editing my profile, I want a calm, keyboard/screen-reader-friendly
confirmation when my changes save so that I know they took effect and I am not silently dropped
to the top of the page.

## What I observed

Observed 2026-07-02. On `/profile`, opening "Edit your profile", changing bio, languages,
seeking, adding a personality prompt, and adding a sport, then clicking "Save profile":

- The PATCH to `/api/account/profile` returns 200 and the edits DO persist (verified in the
  rendered profile after reload: new bio, "Romanian", the prompt answer, and "Padel" all appear).
- BUT the success path is a full-document reload. `EditProfileForm.tsx` sets a
  `role="status"` message "Profile updated." and then immediately calls `window.location.reload()`
  on the next line — so the polite announcement is destroyed before assistive tech can read it,
  and there is no surviving success confirmation.
- After the reload, keyboard/screen-reader focus is dropped to `<body>` (the disclosure the member
  was working in is collapsed again and focus is lost), so a keyboard or SR member gets no signal
  that the save succeeded and must re-orient from the top of the page.

No console errors, no page errors, no 5xx. 0 overflow at 375/1280. This is purely the
save-confirmation micro-interaction, not a data-loss or authorization issue.

## What I expected

On a successful save, the form should resolve in place (or via `router.refresh()`), announce the
result through a live region that survives long enough to be read, and move focus to the
confirmation — exactly the pattern already shipped and verified for the join-request commit
(CX-20260701-join-request-commitment-hard-reload-no-confirmation) and host accept/decline. A member
should never be dropped to `<body>` after a successful action.

## Reproduction

1. Log in and open `/profile`.
2. Expand "Edit your profile".
3. Change any field (e.g. bio) and click "Save profile".
4. Observe: full-page reload; the "Profile updated." `role="status"` message is destroyed by the
   reload; focus lands on `<body>`; the edit disclosure is collapsed.

Reproduction rate: `1/1 safe attempts` (source-confirmed at EditProfileForm.tsx line ~73:
`setMessage("Profile updated."); window.location.reload();`).

## Customer impact

Accessibility floor: a keyboard-only or screen-reader member gets no readable confirmation that
their profile saved and is dropped to the top of the page, having to re-verify their edits manually.
Sighted mouse members see a jarring full-page flash. No authorization, privacy, precise-location,
or data-loss risk (the save itself works). Accessibility is involved (WCAG 4.1.3 status messages;
focus management). Lower severity than the join-request case because profile editing is less
emotionally loaded than committing to meet a stranger, but it is the same accepted defect class.

## Evidence and limits

- Evidence: live drive as a pooled account (login once, session reused); PATCH 200; edits verified
  persisted post-reload; source at `apps/web/src/components/EditProfileForm.tsx` (`window.location.reload()`
  in the submit success branch, immediately after `setMessage("Profile updated.")`).
- Redactions made: credentials and account identifiers omitted; test-account profile mutated then
  fully reverted to its original state via the API.
- Facts: save succeeds and persists; success uses `window.location.reload()`; the `role="status"`
  message cannot be read before the reload; focus is not managed to a confirmation.
- Hypotheses to verify during implementation: replacing reload with in-place resolution +
  `router.refresh()` keeps all rendered profile sections (intro, languages, sports, prompts) in sync
  without a hard nav.
- Paths or surfaces not tested: mobile app profile edit (web only this pass); photo upload
  (dev BLOB 502 known — the upload control renders, not exercised here).

## Duplicate check

- Search terms used: profile, edit, reload, window.location, focus body, Profile updated, EditProfileForm.
- Tickets reviewed: active queue + archive; join-request-commitment-hard-reload (verified),
  host-accept-decline-hard-reload (archived), empty-states-lack-warmth (touches EditProfileForm anchor,
  not the save reload), native-select-dropdowns, discovery-language.
- Why this is new: no existing ticket covers the `/profile` edit-save confirmation. The two archived
  hard-reload tickets are on different surfaces (join-request commit; host accept/decline) and are
  already fixed; this is the same accepted defect class on a third, still-unfixed surface.

## Acceptance criteria

- [ ] Saving a profile edit no longer triggers a full-document reload (`window.location.reload()`
      removed from the success path).
- [ ] On success, a live region ("Profile updated." or similar calm copy) survives long enough to be
      announced to assistive tech, and focus moves to the confirmation (never `<body>`).
- [ ] All rendered profile sections (intro/bio, languages, sports, prompts, seeking) reflect the saved
      values without a hard navigation (e.g. via `router.refresh()`).
- [ ] Reduced-motion parity: any reveal/transition is instant-swap under `prefers-reduced-motion`.
- [ ] Error path unchanged in spirit: a failed save still shows a readable, recoverable message and
      re-enables the button.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by user-sim; status `ready`.
- 2026-07-02 - Implemented (build agent), commit `8a0532a`, status `implemented`. Removed `window.location.reload()` from the save success path in `apps/web/src/components/EditProfileForm.tsx`. On a successful PATCH the form now resolves in place: it sets a persistent, focusable `role="status"` / `aria-live="polite"` confirmation ("Profile updated.") and calls `router.refresh()` (from `next/navigation`) so the server-rendered profile sections (intro/bio, languages, sports, prompts, seeking) re-sync without a hard navigation, preserving local state and scroll. A callback ref (`focusOnConfirmRef` + `attachConfirmation`, mirroring the verified JoinRequestControls / host accept-decline fixes) moves focus to the confirmation the moment it mounts, so keyboard / screen-reader focus lands on it and is never dropped to `<body>`. Errors keep their own `role="alert"` inline message and re-enable the Save button; the editor stays usable, no data loss. Success is instant (no motion) so reduced-motion parity is automatic. Extracted a presentational `EditProfileConfirmation` and added `apps/web/src/components/EditProfileForm.test.tsx` (asserts the confirmation is a polite live region and a keyboard focus target; source tripwires that `window.location.reload()` stays gone, `router.refresh()` is used, and the error path keeps `role="alert"` + re-enables the button). Added `.edit-profile-status` calm/positive style in `globals.css` (existing `--line`/lime tokens, visible focus via global fallback). Checks (apps/web): typecheck pass, lint 0 errors, test 582 passed / 12 skipped, production build pass. No migration.
- 2026-07-02 - VERIFIED (Tester, independent, worktree-isolated at clean HEAD incl. 8a0532a). All 6 properties pass: (1) `grep window.location.reload` = 0 matches; save success sets `confirmation` state + calls `router.refresh()` (next/navigation) to re-sync server-rendered sections without a full reload (state/scroll preserved). (2) EditProfileConfirmation is a tabIndex={-1} target with an attach callback ref; attachConfirmation calls node.focus() on mount gated by focusOnConfirmRef (set true only on save-resolve, so re-renders don't steal focus) — mirrors verified JoinRequestControls; focus never left on body. (3) persistent `<p role="status" aria-live="polite" tabIndex={-1}>` from confirmation state (not torn down by reload); calm copy "Profile updated." (4) error path = separate role="alert" + setSaving(false) re-enable; success/error separate state. (5) instant success (reduced-motion parity); .edit-profile-status tokens only; visible focus via global [tabindex]:focus-visible fallback. (6) 6 tests non-tautological (live-region markup+copy, focusable target, no-gamification, tripwires that reload stays gone + router.refresh used, error keeps role=alert+re-enable). Checks the Tester ran: typecheck PASS, lint 0 errors, test 582 passed/12 skipped, prod build PASS. Orchestrator archived.
