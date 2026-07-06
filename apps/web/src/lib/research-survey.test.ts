import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  Q11_FACTORS,
  RESEARCH_FREE_TEXT_MAX,
  RESEARCH_SURVEY_INTRO,
  SURVEY_ONE_QUESTIONS,
  SURVEY_TWO_QUESTIONS,
  sanitizeResearchContact,
  sanitizeSurveyOneAnswers,
  sanitizeSurveyTwoAnswers,
} from "./research-survey";

/**
 * VERBATIM tripwire (CX-20260704): the survey kit's questions were written to
 * be non-leading and answer-neutral, and the ticket forbids rewriting them.
 * Normalise the kit's markdown (strip emphasis asterisks, blockquote markers,
 * and line wrapping) and assert every question text and the intro notice we
 * render still appear in it word-for-word. If either side drifts, this fails.
 */
const kit = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../docs/marketing/member-survey-and-forum-kit.md"),
  "utf8",
);
const normalizedKit = kit
  .replace(/^\s*>\s?/gm, "") // blockquote markers
  .replace(/\*/g, "") // markdown emphasis
  .replace(/\s+/g, " "); // unwrap lines

describe("survey wording is verbatim from the kit (non-leading by design)", () => {
  it("renders the kit's intro notice word-for-word", () => {
    expect(normalizedKit).toContain(RESEARCH_SURVEY_INTRO);
  });

  // Tripwire for CX-20260706-research-page-denies-product-exists: the product is
  // live (open beta), so the intro must never again tell survey visitors there is
  // nothing to join — while staying honest that answering is not a sign-up.
  it("does not deny the product exists, yet stays a non-recruiting research notice", () => {
    expect(RESEARCH_SURVEY_INTRO).not.toMatch(/no service to join/i);
    expect(RESEARCH_SURVEY_INTRO).not.toMatch(/no (?:app|product|service) (?:yet|exists)/i);
    expect(RESEARCH_SURVEY_INTRO).toContain("not a sign-up");
    expect(RESEARCH_SURVEY_INTRO).toContain("anonymous");
  });

  it("keeps every Survey 1 and Survey 2 question text word-for-word", () => {
    for (const question of [...SURVEY_ONE_QUESTIONS, ...SURVEY_TWO_QUESTIONS]) {
      expect(normalizedKit, `question ${question.id} drifted from the kit`).toContain(question.text);
    }
  });

  it("keeps the choice options and Q11 factors word-for-word", () => {
    for (const question of [...SURVEY_ONE_QUESTIONS, ...SURVEY_TWO_QUESTIONS]) {
      for (const option of question.options ?? []) {
        expect(normalizedKit, `option "${option}" of ${question.id} drifted from the kit`).toContain(option);
      }
    }
    for (const factor of Q11_FACTORS) {
      expect(normalizedKit).toContain(factor);
    }
  });

  it('preserves the "prefer not to say" escape hatches', () => {
    const q2 = SURVEY_ONE_QUESTIONS.find((question) => question.id === "q2")!;
    const q5 = SURVEY_ONE_QUESTIONS.find((question) => question.id === "q5")!;
    const age = SURVEY_ONE_QUESTIONS.find((question) => question.id === "q8_age")!;
    expect(q2.options).toContain("Prefer not to say");
    expect(q5.options).toContain("Prefer not to say");
    expect(age.options).toContain("prefer not to say");
  });

  it("does not include Q7 (contact) among the anonymous answer questions", () => {
    // Q7 is a separate screen, a separate request, and a separate table — it
    // must never be part of the anonymous answer payload definition.
    const ids = [...SURVEY_ONE_QUESTIONS, ...SURVEY_TWO_QUESTIONS].map((question) => question.id);
    expect(ids).not.toContain("q7");
    expect(ids.some((id) => id.includes("contact"))).toBe(false);
  });
});

describe("sanitizeSurveyOneAnswers — the anonymous write boundary", () => {
  it("accepts a full, valid submission", () => {
    const clean = sanitizeSurveyOneAnswers({
      q1: "About weekly",
      q2: ["Went alone", "Used an app or website", "Other"],
      q2_other: "Asked at the climbing gym",
      q3: "Meetup, a Strava club",
      q4: "Levels never match",
      q5: "A lot",
      q6: "Seeing who else is coming",
      q8_age: "30-34",
      q8_area: "Bucharest",
    });
    expect(clean).toEqual({
      q1: "About weekly",
      q2: ["Went alone", "Used an app or website", "Other"],
      q2_other: "Asked at the climbing gym",
      q3: "Meetup, a Strava club",
      q4: "Levels never match",
      q5: "A lot",
      q6: "Seeing who else is coming",
      q8_age: "30-34",
      q8_area: "Bucharest",
    });
  });

  it("treats an entirely skipped survey as valid (every question is skippable)", () => {
    expect(sanitizeSurveyOneAnswers({})).toEqual({});
  });

  it("drops unknown keys, invented options, and non-string junk", () => {
    const clean = sanitizeSurveyOneAnswers({
      q1: "Constantly", // not a published option
      q2: ["Went alone", "Hacked the mainframe", 42, "Went alone"],
      q5: { nested: "object" },
      injected: "ignore me",
      ip: "203.0.113.7",
      userAgent: "Mozilla/5.0",
    });
    expect(clean).toEqual({ q2: ["Went alone"] });
  });

  it("clamps free text and trims whitespace-only answers away", () => {
    const clean = sanitizeSurveyOneAnswers({ q4: `${"x".repeat(2000)}`, q3: "   " })!;
    expect((clean.q4 as string).length).toBeLessThanOrEqual(RESEARCH_FREE_TEXT_MAX);
    expect(clean.q3).toBeUndefined();
  });

  it("rejects a non-object payload outright", () => {
    expect(sanitizeSurveyOneAnswers("q1=weekly")).toBeNull();
    expect(sanitizeSurveyOneAnswers([1, 2, 3])).toBeNull();
    expect(sanitizeSurveyOneAnswers(null)).toBeNull();
  });
});

describe("sanitizeSurveyTwoAnswers — extension incl. WTP bands and ratings", () => {
  it("accepts valid Q10–Q15 answers including 1–5 ratings", () => {
    const clean = sanitizeSurveyTwoAnswers({
      q10: ["dating", "making friends"],
      q11: { time: 5, price: 3, "safety information": 4 },
      q12: "Depends",
      q12_depends: "On whether it actually saves coordination effort",
      q13: "€5-9",
      q14: "Fake profiles and hidden pricing",
      q15: "Never show my exact location",
    });
    expect(clean).toEqual({
      q10: ["dating", "making friends"],
      q11: { time: 5, price: 3, "safety information": 4 },
      q12: "Depends",
      q12_depends: "On whether it actually saves coordination effort",
      q13: "€5-9",
      q14: "Fake profiles and hidden pricing",
      q15: "Never show my exact location",
    });
  });

  it("drops out-of-range or non-integer ratings and unknown factors", () => {
    const clean = sanitizeSurveyTwoAnswers({
      q11: { time: 6, price: 0, "the host": 2.7, "safety information": 5, "credit score": 5 },
    });
    expect(clean).toEqual({ q11: { "the host": 2, "safety information": 5 } });
  });

  it("keeps the WTP bands verbatim and rejects invented bands", () => {
    expect(sanitizeSurveyTwoAnswers({ q13: "would not pay" })).toEqual({ q13: "would not pay" });
    expect(sanitizeSurveyTwoAnswers({ q13: "€1000 a month" })).toEqual({});
  });
});

describe("sanitizeResearchContact", () => {
  it("trims and bounds the contact handle", () => {
    expect(sanitizeResearchContact("  ana@example.com  ")).toBe("ana@example.com");
    expect(sanitizeResearchContact("ab")).toBeNull();
    expect(sanitizeResearchContact(42)).toBeNull();
    expect(sanitizeResearchContact(`${"x".repeat(300)}`)!.length).toBeLessThanOrEqual(200);
  });
});
