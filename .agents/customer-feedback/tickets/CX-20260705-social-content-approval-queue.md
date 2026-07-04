# CX-20260705-social-content-approval-queue

- Status: `implemented`
- Severity: `medium`
- Priority: `P1` — owner-directed (2026-07-05): a web approval queue for social content so the owner can approve/deny/comment on post ideas, driving what gets published toward the 1000-follower IG+TikTok goal. Backs the [[social-autopilot]] draft→approve→publish model.
- Surface: new owner-gated API + a web approval page.
- Implementation owner: `agent`

## Goal

Build a **social content approval queue**: the CEO/growth agent files post ideas; the OWNER sees them on a web page with **Approve / Deny** buttons and a **comment box** per idea; approved ideas are what the CEO then renders + schedules to Buffer.

## Data model (migration — new table)

`social_content_ideas`:
- `id uuid pk default gen_random_uuid()`
- `platform text not null` — one of `instagram` | `tiktok` | `both`
- `format text not null` — one of `carousel` | `reel` | `image` | `story`
- `title text not null` — short internal name
- `trend text` — the trend/format being ridden, or `evergreen`
- `hook text not null` — scroll-stopping first line / first slide
- `body jsonb not null` — `{ slides?: string[], script?: string, caption: string, hashtags: string[], cta: string, imageConcept: string }`
- `status text not null default 'pending'` — `pending` | `approved` | `denied`
- `owner_comment text`
- `created_at timestamptz not null default now()`
- `decided_at timestamptz`
- `scheduled_ref text` — optional Buffer id once scheduled (nullable, for later)

Index on `(status, created_at desc)`.

## API — `apps/web/src/app/api/social/ideas/route.ts` (+ `[id]/route.ts`)

- **GET `/api/social/ideas`** — OWNER-GATED. Returns all ideas (or `?status=`). Ordered newest-first.
- **POST `/api/social/ideas/[id]`** — OWNER-GATED. Body `{ action: 'approve'|'deny', comment?: string }`. Sets `status`, `owner_comment`, `decided_at`. Comment alone (no action) is also allowed (updates `owner_comment`).
- **POST `/api/social/ideas`** — INTERNAL, secret-guarded via `SOCIAL_AGENT_SECRET` header (like the existing internal endpoints). Body = one idea or `{ ideas: [...] }`. Inserts with `status='pending'`. This is how the CEO/growth agent seeds the queue. Fail-closed if the secret is unset/mismatched.

**Owner gating:** `getCurrentUser()` must be non-null AND its email must be in `OWNER_EMAILS` (comma-separated env; default to `ey.myacc@gmail.com` if unset so it works pre-config). Non-owner → 403. Reuse the app's existing session helper. Do NOT invent new auth.

## Page — `apps/web/public/social-approve.html`

Static page in the KeepItUp HQ visual style (match `hq.html` tokens/dark theme). On load it `fetch`es `GET /api/social/ideas`:
- If 401/403 → a calm "Sign in as the owner to review the queue" note with a link to `/login`.
- Else render each idea as a card: platform + format badge, trend tag, the hook, the slides (numbered) or script, caption, hashtags, CTA, imageConcept. Each card has **Approve** and **Deny** buttons and a **comment textarea** with a Save button. Buttons POST to `/api/social/ideas/[id]` and reflect the returned status (approved = green, denied = muted, pending = neutral). Show a small filter (All / Pending / Approved / Denied) and a count. Optimistic UI is fine; re-fetch on action to stay honest. Mobile-first, 44px targets, a11y, no external assets (inline CSS/JS only — CSP-safe, same as hq.html).

## DoD

- typecheck / lint / test / production build green. Tests cover: owner-gating (non-owner 403, owner 200), the internal secret path (missing/wrong secret → 401/403; correct → insert), and approve/deny/comment state transitions. Use the existing DB test patterns.
- This ticket ADDS A MIGRATION → **commit but DO NOT push**; report the migration filename and that it's unpushed. Commit the code + migration together; the CEO orchestrates the deploy. `git pull --rebase` first. Do NOT touch other `public/*.html` or `docs/marketing/**`.
- Run the FULL web test suite before finishing (apps/web/src change rule).

## Handoff log

- 2026-07-05 | ceo | filed. Schema + owner-gating + internal-seed contract specified so the growth agent's batch (same `body` shape) can be POSTed straight in. Ready for Builder.
- 2026-07-05 | builder | implemented. Migration `039_social_content_ideas.sql` (table + `(status, created_at desc)` index, `gen_random_uuid()` default per spec) — committed, NOT pushed. New: `src/lib/social-ideas.ts` (types, `normalizeSocialIdeaInput` seed validation, `listSocialIdeas`/`insertSocialIdeas`/`decideSocialIdea`), `src/lib/owner.ts` (`OWNER_EMAILS` allow-list w/ `ey.myacc@gmail.com` default, case-insensitive, built on `getCurrentUser` — no new auth), `isAuthorizedSocialAgent` (SOCIAL_AGENT_SECRET, fail-closed) in `internal-agent-auth.ts`. API: `GET /api/social/ideas` (owner: 401 signed-out / 403 non-owner / 200 owner, `?status=` filter) + internal secret `POST /api/social/ideas` (single or `{ideas:[...]}`, 201) + owner `POST /api/social/ideas/[id]` (approve/deny/comment; comment-alone leaves status). Page `public/social-approve.html` (hq.html tokens, inline CSS/JS, filter+count, per-card Approve/Deny + comment, 401/403 → "sign in as the owner" with /login). typecheck + lint + full suite (1024 passed / 12 skipped, +19 new) + prod build all green. Migration present → committed, unpushed; CEO orchestrates deploy.
