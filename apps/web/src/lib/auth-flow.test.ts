import { describe, expect, it } from "vitest";

import {
  firstSearchParam,
  isBrowserEmailVerificationToken,
  isBrowserPasswordResetToken,
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
