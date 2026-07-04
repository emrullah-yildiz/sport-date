-- Self-hosted anonymous market-research survey (CX-20260704-research-self-hosted-market-survey).
-- Additive only. Two tables, DELIBERATELY UNLINKED:
--
--   research_responses  — the anonymous answers (Survey 1, plus the optional
--                         Survey 2 extension written later onto the same row).
--                         NO ip address, NO user agent, NO user id, NO cookie
--                         value is ever stored here: the row is answers +
--                         timestamps only. Abuse control is a rate limiter that
--                         hashes the IP into a transient counter key
--                         (see lib/rate-limit.ts) and never touches this table.
--
--   research_contacts   — the OPTIONAL research-conversation contact (Survey 1's
--                         Q7), stored only with explicit consent. There is NO
--                         foreign key and NO shared identifier between the two
--                         tables, so a contact can never be joined back to a set
--                         of anonymous answers, and deleting a contact (the
--                         promised deletion route via support@) leaves every
--                         anonymous response row untouched.

CREATE TABLE IF NOT EXISTS research_responses (
  id UUID PRIMARY KEY,
  -- Which questionnaire produced this row, for future survey iterations.
  survey TEXT NOT NULL DEFAULT 'meeting-through-activity-v1' CHECK (length(survey) BETWEEN 1 AND 80),
  -- Survey 1 answers (Q1-Q6 + Q8), sanitized server-side to known keys/options.
  answers JSONB NOT NULL,
  -- Survey 2 answers (Q10-Q15), set at most once when the respondent opts into
  -- the longer set after submitting Survey 1. NULL = declined / never continued.
  extended_answers JSONB,
  extended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_contacts (
  id UUID PRIMARY KEY,
  -- The contact handle exactly as the respondent typed it (email or other),
  -- used ONLY to schedule the research conversation, then deleted.
  contact TEXT NOT NULL CHECK (length(contact) BETWEEN 3 AND 200),
  -- The instant the respondent ticked the explicit consent checkbox. A row can
  -- only exist with consent; the API refuses to store a contact without it.
  consent_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS research_responses_created_at_idx ON research_responses(created_at);
