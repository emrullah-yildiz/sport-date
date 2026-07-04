// The sign-up wizard's step ORDER and per-step gate validation, extracted pure so
// the sequencing rule is testable (CX-20260704-interactive-onboarding-gender-orientation,
// building on CX-20260704-landing-conversion-pack).
//
// Interactive, one-question-per-step flow: the member answers a single focused
// thing per screen, building the warm, personal part of their profile first —
// name, then the optional gender + sexual-orientation questions, then birthday,
// sports, intentions, photos, and area — and is asked for ACCOUNT CREDENTIALS
// (email, password, terms) only as the FINAL input step, immediately before the
// review. The credential REQUIREMENTS themselves are deliberately unchanged: the
// 12-character multi-class password policy, the 18+ date-of-birth gate, and the
// explicit terms confirmation are a security/safety bar, not a conversion lever.
// This module only changes WHICH question each step asks and WHEN.
//
// Gender + sexual orientation are OPTIONAL and never gate advancing a step:
// orientation is GDPR Article 9 special-category data, so it is stored only with
// an explicit opt-in (enforced in the domain sanitizer + DB), never required.
//
// Abandonment safety: all answers live in the zustand sign-up store
// (`useSignUpStore`), which is written per-field as the member types — moving
// between steps never clears anything (asserted in sign-up-steps.test.ts).
//
// Kept free of React/zustand runtime imports so it runs in the node test env;
// the messages here are the exact strings the wizard shows.

import { dateOfBirthError } from "@sport-date/domain";

/** Logical step ids, in the order the wizard presents them. */
export const SIGN_UP_STEP_ORDER = [
  "name", // first name + last name (the warm, personal start)
  "gender", // optional, inclusive options
  "orientation", // optional, GDPR special-category — consent-gated to store
  "birthday", // date of birth / 18+ gate (unchanged policy)
  "sports", // pick 1–5 sports
  "intentions", // what they're looking for + an optional short bio
  "photos", // optional photo(s) — skippable, reuses the existing upload
  "location", // approximate city or region
  "credentials", // email, password, terms — LAST input step (unchanged policy)
  "review", // read-only confirmation + Create account
] as const;

export type SignUpStepId = (typeof SIGN_UP_STEP_ORDER)[number];

/** The subset of sign-up state the per-step gates read. */
export type SignUpStepFields = Readonly<{
  email: string;
  password: string;
  dateOfBirth: string;
  acceptedTerms: boolean;
  firstName: string;
  lastName: string;
  location: string;
  bio: string;
  sports: ReadonlyArray<unknown>;
}>;

/**
 * The gate for advancing PAST a given 1-based step. Returns the member-facing
 * error message, or null when the step is complete. The rules and messages are
 * the pre-existing ones — only their step position changed. The password policy
 * (>= 12 chars, upper + lower + digit) and the 18+ date-of-birth check are
 * intentionally identical to before. Gender + orientation never gate: they are
 * optional, so their steps always return null.
 */
export function signUpStepError(step: number, state: SignUpStepFields): string | null {
  const id = SIGN_UP_STEP_ORDER[step - 1];
  if (id === "name" && (!state.firstName.trim() || !state.lastName.trim())) {
    return "Tell us your name to continue.";
  }
  if (id === "birthday") {
    const dobError = dateOfBirthError(state.dateOfBirth);
    if (dobError) return dobError;
  }
  if (id === "sports" && state.sports.length === 0) return "Choose at least one sport.";
  if (id === "intentions" && state.bio.length > 200) return "Keep your bio within 200 characters.";
  if (id === "location" && !state.location.trim()) return "Add your city or region.";
  if (id === "credentials") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) return "Enter a valid email address.";
    if (state.password.length < 12) return "Use at least 12 characters for your password.";
    if (!/[a-z]/.test(state.password) || !/[A-Z]/.test(state.password) || !/\d/.test(state.password)) {
      return "Include upper-case, lower-case, and numeric characters.";
    }
    if (!state.acceptedTerms) return "Confirm the Terms and Safety Guidelines to continue.";
  }
  return null;
}
