import { describe, expect, it } from "vitest";

import { SIGN_UP_STEP_ORDER, signUpStepError, type SignUpStepFields } from "./sign-up-steps";
import { useSignUpStore } from "./sign-up-store";

// A state that satisfies every step, to isolate one failing rule at a time.
function completeState(over: Partial<SignUpStepFields> = {}): SignUpStepFields {
  return {
    email: "ana@example.com",
    password: "CorrectHorse42Battery",
    dateOfBirth: "1994-05-01",
    acceptedTerms: true,
    firstName: "Ana",
    lastName: "Pop",
    location: "Bucharest",
    bio: "Weekend tennis and long runs.",
    sports: [{ name: "Tennis", skillLevel: "intermediate", frequency: "weekly" }],
    ...over,
  };
}

const stepNumber = (id: (typeof SIGN_UP_STEP_ORDER)[number]) => SIGN_UP_STEP_ORDER.indexOf(id) + 1;

describe("SIGN_UP_STEP_ORDER — interactive one-question-per-step, credentials last (CX-20260704)", () => {
  it("leads with the warm personal question and asks credentials only as the final input step", () => {
    // The friendly, personal start: the member's name…
    expect(SIGN_UP_STEP_ORDER[0]).toBe("name");
    // …credentials are the LAST input step, immediately before the read-only review…
    expect(SIGN_UP_STEP_ORDER[SIGN_UP_STEP_ORDER.length - 2]).toBe("credentials");
    expect(SIGN_UP_STEP_ORDER[SIGN_UP_STEP_ORDER.length - 1]).toBe("review");
    // …and every profile-building step precedes them.
    for (const id of ["name", "gender", "orientation", "birthday", "sports", "intentions", "photos", "location"] as const) {
      expect(stepNumber(id)).toBeLessThan(stepNumber("credentials"));
    }
  });

  it("adds the inclusive gender + sexual-orientation questions before the birthday", () => {
    expect(stepNumber("gender")).toBeLessThan(stepNumber("birthday"));
    expect(stepNumber("orientation")).toBeLessThan(stepNumber("birthday"));
    // Orientation (Article 9 special-category) is a distinct, later question than gender.
    expect(stepNumber("gender")).toBeLessThan(stepNumber("orientation"));
  });
});

describe("signUpStepError — the per-step gates moved with their steps, rules intact", () => {
  it("passes every step for a complete state", () => {
    for (let step = 1; step <= SIGN_UP_STEP_ORDER.length; step += 1) {
      expect(signUpStepError(step, completeState())).toBeNull();
    }
  });

  it("gates the name step, but not on credentials", () => {
    expect(signUpStepError(stepNumber("name"), completeState({ firstName: " " }))).toBe("Tell us your name to continue.");
    expect(signUpStepError(stepNumber("name"), completeState({ lastName: "" }))).toBe("Tell us your name to continue.");
    // Credential emptiness does NOT block the early steps — it is asked later.
    const noCredentialsYet = completeState({ email: "", password: "", acceptedTerms: false });
    expect(signUpStepError(stepNumber("name"), noCredentialsYet)).toBeNull();
  });

  it("never gates the optional gender + sexual-orientation steps", () => {
    // Both are optional: an empty/unanswered state still advances.
    expect(signUpStepError(stepNumber("gender"), completeState())).toBeNull();
    expect(signUpStepError(stepNumber("orientation"), completeState())).toBeNull();
  });

  it("keeps the 18+ date-of-birth gate on the birthday step (unchanged policy)", () => {
    const birthday = stepNumber("birthday");
    expect(signUpStepError(birthday, completeState({ dateOfBirth: "" }))).toBe("Enter your date of birth.");
    expect(signUpStepError(birthday, completeState({ dateOfBirth: "2015-01-01" }))).toContain("18 or older");
  });

  it("gates the sports, intentions, and location steps with their messages", () => {
    expect(signUpStepError(stepNumber("sports"), completeState({ sports: [] }))).toBe("Choose at least one sport.");
    expect(signUpStepError(stepNumber("intentions"), completeState({ bio: "x".repeat(201) }))).toBe("Keep your bio within 200 characters.");
    expect(signUpStepError(stepNumber("location"), completeState({ location: "  " }))).toBe("Add your city or region.");
  });

  it("never gates the optional photos step (it is skippable)", () => {
    expect(signUpStepError(stepNumber("photos"), completeState())).toBeNull();
  });

  it("keeps the 12-character multi-class password policy UNCHANGED on the credentials step", () => {
    const credentials = stepNumber("credentials");
    // Too short — even with all character classes.
    expect(signUpStepError(credentials, completeState({ password: "Aa1short" }))).toBe(
      "Use at least 12 characters for your password.",
    );
    // Long enough but missing a class (no digit).
    expect(signUpStepError(credentials, completeState({ password: "NoDigitsHereAtAll" }))).toBe(
      "Include upper-case, lower-case, and numeric characters.",
    );
    // Missing upper-case.
    expect(signUpStepError(credentials, completeState({ password: "alllowercase123456" }))).toBe(
      "Include upper-case, lower-case, and numeric characters.",
    );
    // Email and terms are still enforced there too.
    expect(signUpStepError(credentials, completeState({ email: "not-an-email" }))).toBe("Enter a valid email address.");
    expect(signUpStepError(credentials, completeState({ acceptedTerms: false }))).toBe(
      "Confirm the Terms and Safety Guidelines to continue.",
    );
  });

  it("the review step gates nothing (final validation happens at submit)", () => {
    expect(signUpStepError(stepNumber("review"), completeState({ email: "", sports: [] }))).toBeNull();
  });
});

describe("abandonment safety — navigating between steps never loses answers", () => {
  it("keeps every typed field intact across forward/back step changes", () => {
    const { setField, addSport, setStep, reset } = useSignUpStore.getState();
    reset();

    // The member invests across the early steps…
    setField("firstName", "Ana");
    setField("gender", "non_binary");
    addSport({ name: "Tennis", skillLevel: "intermediate", frequency: "weekly" });
    setField("bio", "Weekend tennis.");
    setField("seeking", "friendship");
    setField("location", "Bucharest");
    setStep(9);
    // …starts credentials, then walks all the way back and forward again.
    setField("email", "ana@example.com");
    setStep(1);
    setStep(2);
    setStep(9);

    const state = useSignUpStore.getState();
    expect(state.firstName).toBe("Ana");
    expect(state.gender).toBe("non_binary");
    expect(state.sports).toHaveLength(1);
    expect(state.bio).toBe("Weekend tennis.");
    expect(state.seeking).toBe("friendship");
    expect(state.location).toBe("Bucharest");
    expect(state.email).toBe("ana@example.com");

    reset();
  });
});
