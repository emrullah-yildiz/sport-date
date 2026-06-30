# Customer chaos explorer (`qa/`)

A browser-driven, re-runnable customer explorer for the Sport Date **web** app. It
acts like a cautious first-time adult member, drives real UI journeys, mixes in
deliberate chaos / failure paths, instruments the browser for breakage, and emits
a structured findings file plus redacted screenshots. It is an **observation**
tool: it never edits the app or fixes issues. Genuine customer problems are filed
as tickets in `.agents/customer-feedback/tickets/`.

> This is simulated product evaluation, not user research. Findings are not
> evidence from real members.

## What it exercises

Journeys (real UI, not just API):

- **Protected-route redirects** — logged-out visits to `/profile`, `/events/new`,
  `/discover`, `/feedback`, event room, and discovery detail expect a calm
  redirect to `/login`, not a crash.
- **Signup validation** — weak password, missing password classes, underage DOB,
  missing terms, invalid email, over-long bio.
- **Signup happy path** — full 5 steps → auto-login → profile, including a
  mid-step refresh.
- **Login chaos** — wrong credentials (non-revealing message), and repeated bad
  logins to probe rate limiting (expect a calm 429 message, not a scary error).
- **Authenticated member** — profile edit (sports 1–5 limit, bio cap, languages,
  seeking, double-submit), event creation (public vs. private location), discovery
  + filters + join request (with graceful cancel), feedback submission.
- **Navigation chaos** — browser back/forward across member pages.

Per page it captures: `console` errors, uncaught `pageerror`, any response with
status ≥ 500, and navigations to error/not-found pages. A redacted full-page
screenshot is saved to `qa/artifacts/` for each issue.

## Run it

1. Start a dev server with a database configured. The web app reads
   `NEON_DATABASE_URL` (or `DATABASE_URL`). It lives in the repo-root `.env`, but
   `next dev` loads env from `apps/web/`, so export it into the process first:

   ```bash
   # from repo root, Git Bash
   export $(grep -E '^NEON_DATABASE_URL=' .env)
   npm run dev --workspace @sport-date/web   # serves http://localhost:3000
   ```

   Use the **dev** Neon branch only — the explorer creates throwaway synthetic
   accounts (`qa+<random>@sport-date.invalid`, age 18+). Email delivery is off;
   registration + login still work (verification only sets a flag).

2. Run the explorer (waits for the server, then drives Chromium headless):

   ```bash
   npm run qa:explore --workspace @sport-date/web
   # or:  BASE_URL=http://localhost:3000 node apps/web/qa/explore.mjs
   ```

   Useful env vars: `BASE_URL` (default `http://localhost:3000`), `QA_HEADED=1`
   (show the browser), `QA_SLOWMO=250` (slow actions down, ms).

## Output

- `qa/artifacts/findings-latest.json` and `findings-<runId>.json` — structured
  findings (severity, journey, expected vs. observed, facts vs. hypotheses) plus
  noted strengths.
- `qa/artifacts/NN-<label>.png` — redacted screenshots for each issue.

`qa/artifacts/` is gitignored. Text is run through a redactor that strips the test
password, emails, token-bearing URL params, and long hex/uuid blobs.

## Loopability

The script is stateless across runs (a fresh random identity each time) and exits
non-zero only on a harness/preflight failure, so it is safe to run repeatedly,
e.g. in a watch loop, against a stable dev server.

## Not part of `npm test`

This explorer needs a live server + database and a real browser, so it is **not**
wired into the hermetic Vitest suite. It is a standalone `.mjs` script (not a
`*.test.*` file) and is only invoked via `qa:explore`.
