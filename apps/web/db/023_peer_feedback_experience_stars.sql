-- Recipient-visible meetup-experience star rating
-- (CX-20260701-peer-star-rating-recipient-visible-safe).
--
-- Extends the private post-attendance peer signal (022_peer_feedback.sql) with ONE
-- optional 1-5 star rating anchored to the MEETUP EXPERIENCE — reliability, respect,
-- and how the shared activity went. It is explicitly NOT an attractiveness /
-- desirability / popularity score; the application layer accepts only this single
-- experience-anchored field and rejects any other rating key.
--
-- Visibility is deliberately bounded (owner decision
-- CX-20260701-owner-decision-peer-rating-visibility-and-dimensions) and enforced in
-- the application layer (lib/peer-feedback.ts, unit-tested): DOUBLE-BLIND reveal (a
-- member sees a star they received only after submitting their own for that
-- co-attendance, or after a reveal window passes), recipient-visible as an AGGREGATE
-- AVERAGE only and only at ≥3 ratings, never who-gave-what, and never shown to other
-- members or on public profiles. The table only adds the nullable column; every
-- existing invariant from 022 (UNIQUE(event, from, to), CHECK from<>to, cascades)
-- is untouched.

ALTER TABLE peer_feedback
  ADD COLUMN IF NOT EXISTS experience_stars SMALLINT
    CHECK (experience_stars IS NULL OR experience_stars BETWEEN 1 AND 5);
