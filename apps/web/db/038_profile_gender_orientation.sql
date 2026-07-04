-- Gender + sexual orientation on the member profile, with GDPR care
-- (CX-20260704-interactive-onboarding-gender-orientation).
--
-- Additive and NULLABLE — no backfill, no assumptions about existing members.
-- Both fields are OPTIONAL and never gate participation or safety.
--
-- Sexual orientation is GDPR Article 9 SPECIAL-CATEGORY data ("sex life or
-- sexual orientation"). It is stored ONLY with an explicit, unbundled opt-in:
-- `orientation_consent_at` records the moment the member consented, and the app
-- refuses to store any orientation value without it. Gender identity is handled
-- with similar care (optional, not public by default).
--
-- VISIBILITY: both default to NOT publicly shown (`*_visible = FALSE`). The
-- member controls exposure; matching/discovery USE is a follow-up ticket. These
-- columns live on the `users` row, so account erasure (the hard-delete proven in
-- audit-erasure.integration.test.ts) removes them with the rest of the profile;
-- the GDPR data export (api/account/export) includes them.
--
-- NOTE for EU-counsel review (HQ card #7): flag the Article 9 consent basis,
-- retention, and visibility model. Counsel sign-off is not a build blocker but
-- must be recorded before this ships to real members.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IS NULL OR gender IN ('woman', 'man', 'non_binary', 'self_describe', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS gender_self_describe TEXT
    CHECK (gender_self_describe IS NULL OR length(gender_self_describe) <= 80),
  ADD COLUMN IF NOT EXISTS gender_visible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sexual_orientation TEXT
    CHECK (sexual_orientation IS NULL OR sexual_orientation IN (
      'straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'asexual', 'queer', 'questioning', 'self_describe', 'prefer_not_to_say'
    )),
  ADD COLUMN IF NOT EXISTS orientation_self_describe TEXT
    CHECK (orientation_self_describe IS NULL OR length(orientation_self_describe) <= 80),
  ADD COLUMN IF NOT EXISTS orientation_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS orientation_visible BOOLEAN NOT NULL DEFAULT FALSE;

-- Defence in depth: an orientation value may only exist WITH a consent stamp.
-- (DROP-then-ADD so the migration is safely idempotent — Postgres has no
-- ADD CONSTRAINT IF NOT EXISTS.)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_orientation_requires_consent;
ALTER TABLE users ADD CONSTRAINT users_orientation_requires_consent
  CHECK (sexual_orientation IS NULL OR orientation_consent_at IS NOT NULL);
