import { describe, expect, it } from "vitest";

import {
  ageOnDate,
  dateOfBirthError,
  GENDER_OPTIONS,
  sanitizeSensitiveProfileFields,
  SELF_DESCRIBE_MAX,
  SEXUAL_ORIENTATION_OPTIONS,
  validateLogin,
  validateProfileUpdate,
  validateRegistration,
} from "./registration";

const validInput = {
  email: " Athlete@Example.com ", password: "StrongPassword9",
  dateOfBirth: "2000-06-29", firstName: "Ana", lastName: "Popescu",
  location: "Bucharest", bio: "Here for tennis.", seeking: "dating",
  sports: [{ name: "Tennis", skillLevel: "intermediate", frequency: "weekly" }],
  acceptedTerms: true,
};

describe("registration validation", () => {
  it("normalizes and accepts complete adult registration data", () => {
    const result = validateRegistration(validInput, new Date("2026-06-29T12:00:00Z"));
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.email).toBe("athlete@example.com");
  });

  it("rejects invalid calendar dates and underage users", () => {
    expect(ageOnDate("2008-06-30", new Date("2026-06-29T12:00:00Z"))).toBe(17);
    expect(ageOnDate("2000-02-30", new Date("2026-06-29T12:00:00Z"))).toBeNull();
    expect(
      validateRegistration(
        { ...validInput, dateOfBirth: "2008-06-30" },
        new Date("2026-06-29T12:00:00Z"),
      ).valid,
    ).toBe(false);
  });

  it("requires explicit terms acceptance and at least one sport", () => {
    const result = validateRegistration({ ...validInput, acceptedTerms: false, sports: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toHaveLength(2);
  });

  it("rejects weak passwords and duplicate sports", () => {
    const result = validateRegistration({
      ...validInput,
      password: "password",
      sports: [...validInput.sports, ...validInput.sports],
    });
    expect(result.valid).toBe(false);
  });
});

describe("sensitive profile fields — optional gender + GDPR Article 9 orientation", () => {
  it("registration finishes WITHOUT any gender/orientation, storing nulls", () => {
    const result = validateRegistration(validInput, new Date("2026-06-29T12:00:00Z"));
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.gender).toBeNull();
      expect(result.data.sexualOrientation).toBeNull();
      expect(result.data.orientationConsent).toBe(false);
      expect(result.data.genderVisible).toBe(false);
      expect(result.data.orientationVisible).toBe(false);
    }
  });

  it("accepts every inclusive gender option and defaults visibility to private", () => {
    for (const gender of GENDER_OPTIONS) {
      const { data, errors } = sanitizeSensitiveProfileFields({ gender });
      expect(errors).toEqual([]);
      expect(data.gender).toBe(gender);
      expect(data.genderVisible).toBe(false);
    }
    // An unknown value is simply dropped to null, never an error (optional field).
    expect(sanitizeSensitiveProfileFields({ gender: "robot" }).data.gender).toBeNull();
  });

  it("stores an orientation ONLY with explicit consent (special-category gate)", () => {
    for (const orientation of SEXUAL_ORIENTATION_OPTIONS) {
      // Picked but NOT consented → nothing sensitive is stored.
      const withoutConsent = sanitizeSensitiveProfileFields({ sexualOrientation: orientation });
      expect(withoutConsent.data.sexualOrientation).toBeNull();
      expect(withoutConsent.data.orientationConsent).toBe(false);

      // Picked AND consented → the value is kept, consent recorded.
      const withConsent = sanitizeSensitiveProfileFields({ sexualOrientation: orientation, orientationConsent: true });
      expect(withConsent.data.sexualOrientation).toBe(orientation);
      expect(withConsent.data.orientationConsent).toBe(true);
    }
  });

  it("keeps the self-describe free text only for self_describe, and bounds its length", () => {
    const kept = sanitizeSensitiveProfileFields({ gender: "self_describe", genderSelfDescribe: "  Agender  " });
    expect(kept.data.genderSelfDescribe).toBe("Agender");

    const dropped = sanitizeSensitiveProfileFields({ gender: "woman", genderSelfDescribe: "ignored" });
    expect(dropped.data.genderSelfDescribe).toBe("");

    const tooLong = sanitizeSensitiveProfileFields({ gender: "self_describe", genderSelfDescribe: "x".repeat(SELF_DESCRIBE_MAX + 1) });
    expect(tooLong.errors.length).toBe(1);
  });

  it("carries consented orientation through registration end to end", () => {
    const result = validateRegistration(
      { ...validInput, gender: "non_binary", sexualOrientation: "queer", orientationConsent: true, orientationVisible: true },
      new Date("2026-06-29T12:00:00Z"),
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.gender).toBe("non_binary");
      expect(result.data.sexualOrientation).toBe("queer");
      expect(result.data.orientationConsent).toBe(true);
      expect(result.data.orientationVisible).toBe(true);
    }
  });

  it("lets a profile update carry (and clear) the sensitive fields", () => {
    const withOrientation = validateProfileUpdate({
      firstName: "Ana", lastName: "Popescu", location: "Bucharest", bio: "", seeking: "dating",
      languages: [], sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "casual" }],
      gender: "woman", sexualOrientation: "bisexual", orientationConsent: true,
    });
    expect(withOrientation.valid).toBe(true);
    if (withOrientation.valid) {
      expect(withOrientation.data.gender).toBe("woman");
      expect(withOrientation.data.sexualOrientation).toBe("bisexual");
    }

    // Removing consent on update clears the special-category value.
    const cleared = validateProfileUpdate({
      firstName: "Ana", lastName: "Popescu", location: "Bucharest", bio: "", seeking: "dating",
      languages: [], sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "casual" }],
      sexualOrientation: "bisexual", orientationConsent: false,
    });
    expect(cleared.valid).toBe(true);
    if (cleared.valid) expect(cleared.data.sexualOrientation).toBeNull();
  });
});

describe("inline date-of-birth validation", () => {
  const today = new Date("2026-06-29T12:00:00Z");

  it("flags an empty date of birth", () => {
    expect(dateOfBirthError("", today)).toBe("Enter your date of birth.");
  });

  it("flags invalid or future dates", () => {
    expect(dateOfBirthError("2000-02-30", today)).toBe("Enter a valid date of birth.");
    expect(dateOfBirthError("2030-01-01", today)).toBe("Enter a valid date of birth.");
  });

  it("blocks under-18 applicants the moment the birthday is entered", () => {
    expect(dateOfBirthError("2008-06-30", today)).toBe("You must be 18 or older to use Sport Date.");
  });

  it("clears once the applicant is 18 or older", () => {
    expect(dateOfBirthError("2008-06-29", today)).toBeNull();
    expect(dateOfBirthError("2000-06-29", today)).toBeNull();
  });
});

describe("login validation", () => {
  it("normalizes valid credentials", () => {
    expect(validateLogin({ email: " ANA@Example.com ", password: "secret" })).toEqual({
      valid: true,
      data: { email: "ana@example.com", password: "secret" },
    });
  });

  it("returns the same validation shape for missing credentials", () => {
    const result = validateLogin({ email: "invalid", password: "" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toHaveLength(2);
  });
});

describe("profile update validation", () => {
  it("accepts a complete member-owned profile update", () => {
    const result = validateProfileUpdate({
      firstName: " Ana ", lastName: "Popescu", location: "Bucharest", bio: "Runs before breakfast.",
      seeking: "friendship", languages: ["Romanian", "English"],
      sports: [{ name: "Running", skillLevel: "intermediate", frequency: "weekly" }],
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.firstName).toBe("Ana");
  });

  it("rejects duplicate languages and sports", () => {
    const sport = { name: "Running", skillLevel: "intermediate", frequency: "weekly" };
    const result = validateProfileUpdate({
      firstName: "Ana", lastName: "Popescu", location: "Bucharest", bio: "", seeking: "dating",
      languages: ["English", "english"], sports: [sport, sport],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toEqual(expect.arrayContaining(["Choose each language only once.", "Choose each sport only once."]));
  });

  it("accepts and trims optional personality prompts from the curated list", () => {
    const result = validateProfileUpdate({
      firstName: "Ana", lastName: "Popescu", location: "Bucharest", bio: "", seeking: "group",
      languages: ["Romanian"], sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "casual" }],
      prompts: [{ prompt: "A perfect Saturday game is…", answer: "  doubles, then coffee  " }],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.prompts).toEqual([{ prompt: "A perfect Saturday game is…", answer: "doubles, then coffee" }]);
    }
  });

  it("treats prompts as optional: missing or blank-answer prompts are dropped", () => {
    const withoutPrompts = validateProfileUpdate({
      firstName: "Ana", lastName: "Popescu", location: "Bucharest", bio: "", seeking: "friendship",
      languages: [], sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "casual" }],
    });
    expect(withoutPrompts.valid).toBe(true);
    if (withoutPrompts.valid) expect(withoutPrompts.data.prompts).toEqual([]);

    const blankAnswer = validateProfileUpdate({
      firstName: "Ana", lastName: "Popescu", location: "Bucharest", bio: "", seeking: "friendship",
      languages: [], sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "casual" }],
      prompts: [{ prompt: "A perfect Saturday game is…", answer: "   " }],
    });
    expect(blankAnswer.valid).toBe(true);
    if (blankAnswer.valid) expect(blankAnswer.data.prompts).toEqual([]);
  });

  it("rejects unknown prompts, over-long answers, too many, and duplicates", () => {
    const unknown = validateProfileUpdate({
      firstName: "Ana", lastName: "Popescu", location: "Bucharest", bio: "", seeking: "dating",
      languages: [], sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "casual" }],
      prompts: [{ prompt: "Where do you live exactly?", answer: "Downtown" }],
    });
    expect(unknown.valid).toBe(false);
    if (!unknown.valid) expect(unknown.errors).toContain("Choose a prompt from the list.");

    const tooLong = validateProfileUpdate({
      firstName: "Ana", lastName: "Popescu", location: "Bucharest", bio: "", seeking: "dating",
      languages: [], sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "casual" }],
      prompts: [{ prompt: "A perfect Saturday game is…", answer: "x".repeat(141) }],
    });
    expect(tooLong.valid).toBe(false);
    if (!tooLong.valid) expect(tooLong.errors).toContain("Keep each prompt answer to 140 characters or fewer.");

    const duplicate = validateProfileUpdate({
      firstName: "Ana", lastName: "Popescu", location: "Bucharest", bio: "", seeking: "dating",
      languages: [], sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "casual" }],
      prompts: [
        { prompt: "A perfect Saturday game is…", answer: "doubles" },
        { prompt: "A perfect Saturday game is…", answer: "singles" },
      ],
    });
    expect(duplicate.valid).toBe(false);
    if (!duplicate.valid) expect(duplicate.errors).toContain("Answer each prompt only once.");

    const tooMany = validateProfileUpdate({
      firstName: "Ana", lastName: "Popescu", location: "Bucharest", bio: "", seeking: "dating",
      languages: [], sports: [{ name: "Tennis", skillLevel: "beginner", frequency: "casual" }],
      prompts: [
        { prompt: "A perfect Saturday game is…", answer: "a" },
        { prompt: "After the match I'm up for…", answer: "b" },
        { prompt: "The sport I'd love to try next is…", answer: "c" },
        { prompt: "You'll get on with me if…", answer: "d" },
      ],
    });
    expect(tooMany.valid).toBe(false);
    if (!tooMany.valid) expect(tooMany.errors).toContain("Answer up to 3 prompts.");
  });
});
