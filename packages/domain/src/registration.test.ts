import { describe, expect, it } from "vitest";

import { ageOnDate, dateOfBirthError, validateLogin, validateProfileUpdate, validateRegistration } from "./registration";

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
});
