export const SEEKING_OPTIONS = ["dating", "friendship", "group"] as const;
export type Seeking = (typeof SEEKING_OPTIONS)[number];

export const SPORT_SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SportSkillLevel = (typeof SPORT_SKILL_LEVELS)[number];

export const SPORT_FREQUENCIES = ["weekly", "biweekly", "monthly", "casual"] as const;
export type SportFrequency = (typeof SPORT_FREQUENCIES)[number];

export type RegistrationSport = Readonly<{
  name: string;
  skillLevel: SportSkillLevel;
  frequency: SportFrequency;
}>;

export type RegistrationInput = Readonly<{
  email: string;
  password: string;
  dateOfBirth: string;
  firstName: string;
  lastName: string;
  location: string;
  bio: string;
  seeking: Seeking;
  sports: readonly RegistrationSport[];
  acceptedTerms: boolean;
}>;

export type RegistrationValidation =
  | { valid: true; data: RegistrationInput }
  | { valid: false; errors: readonly string[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginInput = Readonly<{ email: string; password: string }>;
export type LoginValidation =
  | { valid: true; data: LoginInput }
  | { valid: false; errors: readonly string[] };

export function validateLogin(raw: unknown): LoginValidation {
  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Email and password are required."] };
  }
  const input = raw as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const errors: string[] = [];
  if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.push("Enter a valid email address.");
  if (!password || password.length > 1024) errors.push("Enter your password.");
  return errors.length > 0
    ? { valid: false, errors }
    : { valid: true, data: { email, password } };
}

export function ageOnDate(dateOfBirth: string, today = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;

  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) return null;

  let age = today.getUTCFullYear() - year;
  const birthdayHasPassed =
    today.getUTCMonth() > month - 1 ||
    (today.getUTCMonth() === month - 1 && today.getUTCDate() >= day);
  if (!birthdayHasPassed) age -= 1;
  return age;
}

export function validateRegistration(
  raw: unknown,
  today = new Date(),
): RegistrationValidation {
  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Registration details are required."] };
  }

  const input = raw as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const dateOfBirth = typeof input.dateOfBirth === "string" ? input.dateOfBirth : "";
  const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
  const location = typeof input.location === "string" ? input.location.trim() : "";
  const bio = typeof input.bio === "string" ? input.bio.trim() : "";
  const seeking = input.seeking;
  const acceptedTerms = input.acceptedTerms === true;
  const rawSports = Array.isArray(input.sports) ? input.sports : [];
  const errors: string[] = [];

  if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.push("Enter a valid email address.");
  if (password.length < 12) errors.push("Password must be at least 12 characters.");
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    errors.push("Password must include upper-case, lower-case, and numeric characters.");
  }

  const age = ageOnDate(dateOfBirth, today);
  if (age === null || age < 18) errors.push("You must be at least 18 years old.");
  if (!firstName || firstName.length > 80) errors.push("Enter a first name of 80 characters or fewer.");
  if (!lastName || lastName.length > 80) errors.push("Enter a last name of 80 characters or fewer.");
  if (!location || location.length > 120) errors.push("Enter a city or region of 120 characters or fewer.");
  if (bio.length > 200) errors.push("Bio must be 200 characters or fewer.");
  if (!SEEKING_OPTIONS.includes(seeking as Seeking)) errors.push("Choose a valid connection preference.");
  if (!acceptedTerms) errors.push("Accept the Terms and Safety Guidelines to continue.");
  if (rawSports.length < 1 || rawSports.length > 5) errors.push("Choose between one and five sports.");

  const sports: RegistrationSport[] = [];
  for (const rawSport of rawSports) {
    if (!rawSport || typeof rawSport !== "object") {
      errors.push("Each sport selection must be valid.");
      continue;
    }
    const sport = rawSport as Record<string, unknown>;
    const name = typeof sport.name === "string" ? sport.name.trim() : "";
    const skillLevel = sport.skillLevel;
    const frequency = sport.frequency;
    if (!name || name.length > 60) errors.push("Each sport needs a valid name.");
    if (!SPORT_SKILL_LEVELS.includes(skillLevel as SportSkillLevel)) errors.push("Each sport needs a valid skill level.");
    if (!SPORT_FREQUENCIES.includes(frequency as SportFrequency)) errors.push("Each sport needs a valid frequency.");
    if (
      name && name.length <= 60 &&
      SPORT_SKILL_LEVELS.includes(skillLevel as SportSkillLevel) &&
      SPORT_FREQUENCIES.includes(frequency as SportFrequency)
    ) {
      sports.push({ name, skillLevel: skillLevel as SportSkillLevel, frequency: frequency as SportFrequency });
    }
  }

  if (new Set(sports.map((sport) => sport.name.toLowerCase())).size !== sports.length) {
    errors.push("Choose each sport only once.");
  }
  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    data: {
      email, password, dateOfBirth, firstName, lastName, location, bio,
      seeking: seeking as Seeking, sports, acceptedTerms,
    },
  };
}
