import type { Sport } from "../concepts/concept-data";

/** Fixed concept date keeps adult-eligibility examples repeatable. */
export const PREVIEW_TODAY = "2026-09-25";
export const DEMO_EMAIL = "alex@example.test";
export const DEMO_PASSWORD = "PlayTogether42!";
export const AUTH_SPORTS: Sport[] = ["Tennis", "Running", "Padel"];
export const AUTH_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export type AuthDraft = {
  email: string;
  password: string;
  name: string;
  birthDate: string;
  sport: Sport;
  level: string;
  adultConfirmed: boolean;
  demoNoticeAccepted: boolean;
};
export type AuthErrors = Partial<Record<keyof AuthDraft, string>>;

export function newAuthDraft(): AuthDraft {
  return { email: "", password: "", name: "", birthDate: "", sport: "Tennis", level: "Beginner", adultConfirmed: false, demoNoticeAccepted: false };
}

export function exampleAuthDraft(): AuthDraft {
  return { ...newAuthDraft(), email: DEMO_EMAIL, password: DEMO_PASSWORD, name: "Alex", birthDate: "1998-04-12", level: "Intermediate" };
}

function calendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function isAdultOnPreviewDate(birthDate: string): boolean {
  const birthday = calendarDate(birthDate);
  const today = calendarDate(PREVIEW_TODAY)!;
  if (!birthday || birthday > today) return false;
  let age = today.getUTCFullYear() - birthday.getUTCFullYear();
  if (today.getUTCMonth() < birthday.getUTCMonth() || (today.getUTCMonth() === birthday.getUTCMonth() && today.getUTCDate() < birthday.getUTCDate())) age -= 1;
  return age >= 18;
}

export function validateSignupStep(draft: AuthDraft, step: number): AuthErrors {
  const errors: AuthErrors = {};
  if (step === 0) {
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@example\.test$/i.test(draft.email.trim())) errors.email = "Use a fictional address ending in @example.test.";
    if (draft.password.length < 10) errors.password = "Use at least 10 characters.";
  }
  if (step === 1) {
    if (!draft.name.trim()) errors.name = "Add a name for your player card.";
    else if (draft.name.trim().length > 60) errors.name = "Keep your name to 60 characters.";
    if (!calendarDate(draft.birthDate)) errors.birthDate = "Enter a valid date of birth.";
    else if (!isAdultOnPreviewDate(draft.birthDate)) errors.birthDate = "Players must be 18 or older on 25 September 2026.";
  }
  if (step === 2) {
    if (!AUTH_SPORTS.includes(draft.sport)) errors.sport = "Choose a sport.";
    if (!(AUTH_LEVELS as readonly string[]).includes(draft.level)) errors.level = "Choose your level.";
  }
  if (step === 3) {
    if (!draft.adultConfirmed) errors.adultConfirmed = "Confirm that you are 18 or older.";
    if (!draft.demoNoticeAccepted) errors.demoNoticeAccepted = "Acknowledge the demo terms and privacy notice.";
  }
  return errors;
}

export function validateSignup(draft: AuthDraft): AuthErrors {
  return Object.assign({}, ...[0, 1, 2, 3].map(step => validateSignupStep(draft, step)));
}

export function validateDemoSignIn(email: string, password: string): AuthErrors {
  const errors: AuthErrors = {};
  if (email.trim().toLowerCase() !== DEMO_EMAIL) errors.email = "Use alex@example.test for this demo.";
  if (password !== DEMO_PASSWORD) errors.password = "Choose ‘Use demo details’ to try signing in.";
  return errors;
}
