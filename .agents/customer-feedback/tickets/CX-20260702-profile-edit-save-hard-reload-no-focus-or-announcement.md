# CX-20260702-profile-edit-save-hard-reload-no-focus-or-announcement

- Status: `ready`
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
