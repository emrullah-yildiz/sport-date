import "server-only";

import { randomUUID } from "node:crypto";

import { getDatabase } from "@/lib/db";
import { RESEARCH_SURVEY_ID, type ResearchAnswers } from "@/lib/research-survey";

// Persistence for the anonymous research survey (CX-20260704). Two tables,
// deliberately unlinked (see db/031_research_survey.sql):
//
// - `research_responses` holds ONLY sanitized answers + timestamps. No IP, no
//   user agent, no user id, no cookie — nothing here can identify a respondent.
// - `research_contacts` holds the optional Q7 contact, consent-gated by the API,
//   with NO shared key back to any response row: deleting a contact (the
//   promised deletion route) leaves every anonymous answer intact, and the
//   answers can never be de-anonymised by joining.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Store a sanitized Survey 1 answer set and return the new response id. The id
 * goes back to the browser only so the OPTIONAL Survey 2 extension can attach to
 * the same anonymous row; it identifies a response, never a person.
 */
export async function createResearchResponse(answers: ResearchAnswers): Promise<string> {
  const sql = getDatabase();
  const id = randomUUID();
  await sql`
    INSERT INTO research_responses (id, survey, answers)
    VALUES (${id}::uuid, ${RESEARCH_SURVEY_ID}, ${JSON.stringify(answers)}::jsonb)
  `;
  return id;
}

/**
 * Attach the optional Survey 2 (Q10–Q15) answers to an existing response —
 * at most ONCE (`extended_answers IS NULL` guard), so a leaked/replayed id
 * cannot be used to overwrite what a respondent already said. Returns false
 * when the row is unknown or already extended.
 */
export async function extendResearchResponse(responseId: string, answers: ResearchAnswers): Promise<boolean> {
  if (!UUID_PATTERN.test(responseId)) return false;
  const sql = getDatabase();
  const rows = await sql`
    UPDATE research_responses
    SET extended_answers = ${JSON.stringify(answers)}::jsonb, extended_at = NOW()
    WHERE id = ${responseId}::uuid AND extended_answers IS NULL
    RETURNING id
  ` as unknown as Array<{ id: string }>;
  return rows.length > 0;
}

/**
 * Store an explicitly-consented research-conversation contact (Q7). Takes ONLY
 * the contact string — by design there is no response id parameter, so contact
 * and answers cannot be linked even by a buggy caller. The API layer enforces
 * the consent checkbox before this is ever reached.
 */
export async function createResearchContact(contact: string): Promise<void> {
  const sql = getDatabase();
  await sql`
    INSERT INTO research_contacts (id, contact)
    VALUES (${randomUUID()}::uuid, ${contact})
  `;
}
