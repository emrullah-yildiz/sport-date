const EMAIL_VERIFICATION_TOKEN_PATTERN = /^sdv_[A-Za-z0-9_-]{43}$/;
const PASSWORD_RESET_TOKEN_PATTERN = /^sdp_[A-Za-z0-9_-]{43}$/;

export function firstSearchParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0].trim() : "";
  return "";
}

export function isBrowserEmailVerificationToken(value: unknown): value is string {
  return typeof value === "string" && EMAIL_VERIFICATION_TOKEN_PATTERN.test(value);
}

export function isBrowserPasswordResetToken(value: unknown): value is string {
  return typeof value === "string" && PASSWORD_RESET_TOKEN_PATTERN.test(value);
}

export function validateBrowserPasswordStrength(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 12) errors.push("Password must be at least 12 characters.");
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    errors.push("Password must include upper-case, lower-case, and numeric characters.");
  }
  if (password.length > 1024) errors.push("Password must be 1024 characters or fewer.");
  return errors;
}

export function validatePasswordResetDraft(token: string, password: string, confirmPassword: string): string[] {
  const errors: string[] = [];
  if (!isBrowserPasswordResetToken(token)) errors.push("This reset link is invalid or incomplete.");
  if (!password) {
    errors.push("Enter a new password.");
  } else {
    errors.push(...validateBrowserPasswordStrength(password));
  }
  if (!confirmPassword) {
    errors.push("Confirm your new password.");
  } else if (password !== confirmPassword) {
    errors.push("Passwords do not match.");
  }
  return Array.from(new Set(errors));
}
