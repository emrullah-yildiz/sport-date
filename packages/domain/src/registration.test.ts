import { describe, expect, it } from "vitest";

import { ageOnDate, validateLogin, validateRegistration } from "./registration";

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
    expect(validateRegistration({ ...validInput, dateOfBirth: "2008-06-30" }).valid).toBe(false);
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

