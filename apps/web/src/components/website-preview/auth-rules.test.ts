import { describe, expect, it } from "vitest";
import { DEMO_EMAIL, DEMO_PASSWORD, exampleAuthDraft, isAdultOnPreviewDate, newAuthDraft, validateDemoSignIn, validateSignup, validateSignupStep } from "./auth-rules";

describe("local preview account rules", () => {
  it("accepts only the advertised fictional sign-in credentials", () => {
    expect(validateDemoSignIn(DEMO_EMAIL, DEMO_PASSWORD)).toEqual({});
    expect(validateDemoSignIn("  ALEX@example.test  ", DEMO_PASSWORD)).toEqual({});
    expect(validateDemoSignIn("alex@example.com", DEMO_PASSWORD)).toHaveProperty("email");
    expect(validateDemoSignIn("other@example.test", DEMO_PASSWORD)).toHaveProperty("email");
    expect(validateDemoSignIn(DEMO_EMAIL, "wrong-password")).toHaveProperty("password");
  });

  it("does not preselect either explicit acknowledgement", () => {
    for (const draft of [newAuthDraft(), exampleAuthDraft()]) {
      expect(draft.adultConfirmed).toBe(false);
      expect(draft.demoNoticeAccepted).toBe(false);
      expect(validateSignupStep(draft, 3)).toHaveProperty("adultConfirmed");
      expect(validateSignupStep(draft, 3)).toHaveProperty("demoNoticeAccepted");
    }
  });

  it("restricts signup to fictional addresses and validates each account field", () => {
    const draft = exampleAuthDraft();
    expect(validateSignupStep(draft, 0)).toEqual({});
    expect(validateSignupStep({ ...draft, email: "alex@example.test.attacker.com" }, 0)).toHaveProperty("email");
    expect(validateSignupStep({ ...draft, email: "alex@real.com" }, 0)).toHaveProperty("email");
    expect(validateSignupStep({ ...draft, email: "@example.test" }, 0)).toHaveProperty("email");
    expect(validateSignupStep({ ...draft, email: "Alex+play@example.test" }, 0)).toEqual({});
    expect(validateSignupStep({ ...draft, password: "123456789" }, 0)).toHaveProperty("password");
  });

  it("uses calendar age at the preview date, including the exact eighteenth birthday", () => {
    expect(isAdultOnPreviewDate("2008-09-25")).toBe(true);
    expect(isAdultOnPreviewDate("2008-09-26")).toBe(false);
    expect(isAdultOnPreviewDate("2008-09-24")).toBe(true);
    expect(isAdultOnPreviewDate("2008-02-29")).toBe(true);
    for (const date of ["2008-02-30", "2009-02-29", "2027-01-01", "2026-09-25", "1998-13-01", "12/04/1998", ""]) expect(isAdultOnPreviewDate(date)).toBe(false);
  });

  it("validates player details and rechecks all four stages before completion", () => {
    const valid = { ...exampleAuthDraft(), adultConfirmed: true, demoNoticeAccepted: true };
    expect(validateSignup(valid)).toEqual({});
    expect(validateSignup({ ...valid, birthDate: "2010-04-12" })).toHaveProperty("birthDate");
    expect(validateSignup({ ...valid, name: " " })).toHaveProperty("name");
    expect(validateSignup({ ...valid, name: "A".repeat(61) })).toHaveProperty("name");
    expect(validateSignup({ ...valid, level: "World champion" })).toHaveProperty("level");
    expect(validateSignup({ ...valid, demoNoticeAccepted: false })).toHaveProperty("demoNoticeAccepted");
    expect(validateSignup({ ...valid, adultConfirmed: false })).toHaveProperty("adultConfirmed");
  });
});
