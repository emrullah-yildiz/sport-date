// The sign-up wizard's step ORDER and per-step gate validation, extracted pure so
// the sequencing rule is testable (CX-20260704-landing-conversion-pack, fix 3).
//
// Sequencing rule (investment first, credentials last): a cold mobile visitor
// starts by building the fun, personal part of their profile — sports, then
// intent/bio, then name/area — and is asked for account credentials (email,
// password, date of birth, terms) only as the FINAL input step, immediately
// before the review. The credential REQUIREMENTS themselves are deliberately
// unchanged: the 12-character multi-class password policy, the 18+ date-of-birth
// gate, and the explicit terms confirmation are a security/safety bar, not a
// conversion lever. This module only changes WHEN they are asked.
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
  "sports", // pick 1–5 sports (the invested, fun start)
  "about", // bio (optional) + the intent: dating / friendship / group
  "identity", // first name, last name, approximate location
  "credentials", // email, password, date of birth, terms — LAST input step
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
 * (>= 12 chars, upper + lower + digit) is intentionally identical to before.
 */
export function signUpStepError(step: number, state: SignUpStepFields): string | null {
  const id = SIGN_UP_STEP_ORDER[step - 1];
  if (id === "sports" && state.sports.length === 0) return "Choose at least one sport.";
  if (id === "about" && state.bio.length > 200) return "Keep your bio within 200 characters.";
  if (id === "identity" && (!state.firstName.trim() || !state.lastName.trim() || !state.location.trim())) {
    return "Complete your name and location.";
  }
  if (id === "credentials") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) return "Enter a valid email address.";
    if (state.password.length < 12) return "Use at least 12 characters for your password.";
    if (!/[a-z]/.test(state.password) || !/[A-Z]/.test(state.password) || !/\d/.test(state.password)) {
      return "Include upper-case, lower-case, and numeric characters.";
    }
    const dobError = dateOfBirthError(state.dateOfBirth);
    if (dobError) return dobError;
    if (!state.acceptedTerms) return "Confirm the Terms and Safety Guidelines to continue.";
  }
  return null;
}
