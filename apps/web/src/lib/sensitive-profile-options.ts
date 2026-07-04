// Human-readable labels for the optional, GDPR-careful gender + sexual-orientation
// fields (CX-20260704-interactive-onboarding-gender-orientation). Shared by the
// signup wizard, the review step, and the profile editor so the inclusive option
// SETS and their wording live in exactly one place. The machine values come from
// the domain option arrays (the single source of truth the DB CHECKs mirror).

import {
  GENDER_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  type Gender,
  type SexualOrientation,
} from "@sport-date/domain";

export const GENDER_LABELS: Record<Gender, string> = {
  woman: "Woman",
  man: "Man",
  non_binary: "Non-binary",
  self_describe: "Prefer to self-describe",
  prefer_not_to_say: "Prefer not to say",
};

export const SEXUAL_ORIENTATION_LABELS: Record<SexualOrientation, string> = {
  straight: "Straight",
  gay: "Gay",
  lesbian: "Lesbian",
  bisexual: "Bisexual",
  pansexual: "Pansexual",
  asexual: "Asexual",
  queer: "Queer",
  questioning: "Questioning",
  self_describe: "Prefer to self-describe",
  prefer_not_to_say: "Prefer not to say",
};

export const GENDER_CHOICES: ReadonlyArray<{ value: Gender; label: string }> =
  GENDER_OPTIONS.map((value) => ({ value, label: GENDER_LABELS[value] }));

export const SEXUAL_ORIENTATION_CHOICES: ReadonlyArray<{ value: SexualOrientation; label: string }> =
  SEXUAL_ORIENTATION_OPTIONS.map((value) => ({ value, label: SEXUAL_ORIENTATION_LABELS[value] }));

/** The member-facing label for a stored gender value (self-describe shows the free text). */
export function genderDisplay(gender: Gender | null, selfDescribe: string): string | null {
  if (!gender) return null;
  if (gender === "self_describe") return selfDescribe.trim() || GENDER_LABELS.self_describe;
  return GENDER_LABELS[gender];
}

/** The member-facing label for a stored orientation value (self-describe shows the free text). */
export function orientationDisplay(orientation: SexualOrientation | null, selfDescribe: string): string | null {
  if (!orientation) return null;
  if (orientation === "self_describe") return selfDescribe.trim() || SEXUAL_ORIENTATION_LABELS.self_describe;
  return SEXUAL_ORIENTATION_LABELS[orientation];
}
