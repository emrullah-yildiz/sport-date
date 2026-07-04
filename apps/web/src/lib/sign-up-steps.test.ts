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

describe("SIGN_UP_STEP_ORDER — investment first, credentials last (CX-20260704)", () => {
  it("starts with profile-building and asks for credentials only as the final input step", () => {
    // Sports open the wizard (the fun, invested start)…
    expect(SIGN_UP_STEP_ORDER[0]).toBe("sports");
    // …credentials are the LAST input step, immediately before the read-only review…
    expect(SIGN_UP_STEP_ORDER[SIGN_UP_STEP_ORDER.length - 2]).toBe("credentials");
    expect(SIGN_UP_STEP_ORDER[SIGN_UP_STEP_ORDER.length - 1]).toBe("review");
    // …and every profile-building step precedes them.
    expect(stepNumber("about")).toBeLessThan(stepNumber("credentials"));
    expect(stepNumber("identity")).toBeLessThan(stepNumber("credentials"));
  });
});

describe("signUpStepError — the per-step gates moved with their steps, rules intact", () => {
  it("passes every step for a complete state", () => {
    for (let step = 1; step <= SIGN_UP_STEP_ORDER.length; step += 1) {
      expect(signUpStepError(step, completeState())).toBeNull();
    }
  });

  it("gates step 1 on choosing a sport (not on credentials)", () => {
    expect(signUpStepError(stepNumber("sports"), completeState({ sports: [] }))).toBe("Choose at least one sport.");
    // Credential emptiness does NOT block the early steps — it is asked later.
    const noCredentialsYet = completeState({ email: "", password: "", dateOfBirth: "", acceptedTerms: false });
    expect(signUpStepError(stepNumber("sports"), noCredentialsYet)).toBeNull();
    expect(signUpStepError(stepNumber("about"), noCredentialsYet)).toBeNull();
    expect(signUpStepError(stepNumber("identity"), noCredentialsYet)).toBeNull();
  });

  it("gates the about and identity steps with the pre-existing messages", () => {
    expect(signUpStepError(stepNumber("about"), completeState({ bio: "x".repeat(201) }))).toBe("Keep your bio within 200 characters.");
    expect(signUpStepError(stepNumber("identity"), completeState({ location: "  " }))).toBe("Complete your name and location.");
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
    // Email, DOB, and terms are still enforced there too.
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

    // The member invests in the early steps…
    addSport({ name: "Tennis", skillLevel: "intermediate", frequency: "weekly" });
    setField("bio", "Weekend tennis.");
    setField("seeking", "friendship");
    setField("firstName", "Ana");
    setField("location", "Bucharest");
    setStep(4);
    // …starts credentials, then walks all the way back and forward again.
    setField("email", "ana@example.com");
    setStep(1);
    setStep(2);
    setStep(4);

    const state = useSignUpStore.getState();
    expect(state.sports).toHaveLength(1);
    expect(state.bio).toBe("Weekend tennis.");
    expect(state.seeking).toBe("friendship");
    expect(state.firstName).toBe("Ana");
    expect(state.location).toBe("Bucharest");
    expect(state.email).toBe("ana@example.com");

    reset();
  });
});
