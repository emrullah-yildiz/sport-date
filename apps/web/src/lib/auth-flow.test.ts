import { describe, expect, it } from "vitest";

import {
  PASSWORD_MIN_LENGTH,
  firstSearchParam,
  isBrowserEmailVerificationToken,
  isBrowserPasswordResetToken,
  passwordRequirementsText,
  validateBrowserPasswordStrength,
  validatePasswordResetDraft,
} from "./auth-flow";

describe("auth flow helpers", () => {
  it("normalizes search parameter values", () => {
    expect(firstSearchParam(" sdv_token ")).toBe("sdv_token");
    expect(firstSearchParam([" first ", "second"])).toBe("first");
    expect(firstSearchParam(undefined)).toBe("");
  });

  it("accepts only the intended token formats", () => {
    expect(isBrowserEmailVerificationToken(`sdv_${"A".repeat(43)}`)).toBe(true);
    expect(isBrowserPasswordResetToken(`sdp_${"B".repeat(43)}`)).toBe(true);
    expect(isBrowserEmailVerificationToken(`sdp_${"B".repeat(43)}`)).toBe(false);
    expect(isBrowserPasswordResetToken("invalid-token")).toBe(false);
  });

  it("keeps browser password guidance aligned with server rules", () => {
    expect(validateBrowserPasswordStrength("short")).toContain("Password must be at least 12 characters.");
    expect(validateBrowserPasswordStrength("alllowercase123")).toContain(
      "Password must include upper-case, lower-case, and numeric characters.",
    );
    expect(validateBrowserPasswordStrength("LongEnough123")).toEqual([]);
  });

  it("states the full requirements up front from the same source the validator enforces", () => {
    // The up-front copy must name the enforced minimum length, and it must be DERIVED
    // from PASSWORD_MIN_LENGTH rather than a hardcoded duplicate — so a future change to
    // the minimum updates the disclosed rule and the enforced rule together (drift-proof).
    const text = passwordRequirementsText();
    expect(text).toContain(String(PASSWORD_MIN_LENGTH));
    expect(text).toContain("upper-case");
    expect(text).toContain("lower-case");
    expect(text).toContain("number");
    // A password one short of the minimum is rejected with a length error that also cites
    // PASSWORD_MIN_LENGTH, proving copy and enforcement share the same constant.
    const tooShort = "Aa1".padEnd(PASSWORD_MIN_LENGTH - 1, "a");
    expect(tooShort.length).toBe(PASSWORD_MIN_LENGTH - 1);
    expect(validateBrowserPasswordStrength(tooShort)).toContain(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
    expect(validateBrowserPasswordStrength(tooShort + "a")).toEqual([]);
  });

  it("validates reset form drafts before submission", () => {
    expect(validatePasswordResetDraft("", "", "")).toEqual([
      "This reset link is invalid or incomplete.",
      "Enter a new password.",
      "Confirm your new password.",
    ]);
    expect(validatePasswordResetDraft(`sdp_${"B".repeat(43)}`, "LongEnough123", "Mismatch123")).toContain("Passwords do not match.");
    expect(validatePasswordResetDraft(`sdp_${"B".repeat(43)}`, "LongEnough123", "LongEnough123")).toEqual([]);
  });
});
