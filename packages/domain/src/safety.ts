export const SAFETY_REPORT_CATEGORIES = [
  "harassment", "hate", "sexual_misconduct", "violence_threat", "stalking",
  "scam", "impersonation", "suspected_underage", "unsafe_event", "no_show", "other",
] as const;

export type SafetyReportCategory = (typeof SAFETY_REPORT_CATEGORIES)[number];
export type SafetyPriority = "standard" | "urgent" | "critical";

export type SafetyReportInput = Readonly<{
  reportedUserId: string | null;
  eventId: string | null;
  category: SafetyReportCategory;
  details: string;
  blockUser: boolean;
}>;

export type SafetyReportValidation =
  | { valid: true; data: SafetyReportInput; priority: SafetyPriority }
  | { valid: false; errors: readonly string[] };

export type SafetyAppealValidation =
  | { valid: true; reason: string }
  | { valid: false; errors: readonly string[] };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USER_ID_PATTERN = /^\d+$/;

export function priorityForSafetyCategory(category: SafetyReportCategory): SafetyPriority {
  if (category === "violence_threat" || category === "stalking" || category === "suspected_underage") return "critical";
  if (category === "sexual_misconduct" || category === "hate" || category === "unsafe_event") return "urgent";
  return "standard";
}

export function validateSafetyReport(raw: unknown): SafetyReportValidation {
  if (!raw || typeof raw !== "object") return { valid: false, errors: ["Report details are required."] };
  const input = raw as Record<string, unknown>;
  const reportedUserId = typeof input.reportedUserId === "string" && input.reportedUserId ? input.reportedUserId : null;
  const eventId = typeof input.eventId === "string" && input.eventId ? input.eventId : null;
  const category = input.category;
  const details = typeof input.details === "string" ? input.details.trim() : "";
  const errors: string[] = [];
  if (!reportedUserId && !eventId) errors.push("Choose a person or event to report.");
  if (reportedUserId && !USER_ID_PATTERN.test(reportedUserId)) errors.push("Reported member is invalid.");
  if (eventId && !UUID_PATTERN.test(eventId)) errors.push("Reported event is invalid.");
  if (!SAFETY_REPORT_CATEGORIES.includes(category as SafetyReportCategory)) errors.push("Choose a valid report category.");
  if (details.length < 20 || details.length > 2000) errors.push("Describe what happened using 20 to 2000 characters.");
  if (input.blockUser === true && !reportedUserId) errors.push("Choose a member before blocking.");
  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    data: { reportedUserId, eventId, category: category as SafetyReportCategory, details, blockUser: input.blockUser === true },
    priority: priorityForSafetyCategory(category as SafetyReportCategory),
  };
}

export function validateSafetyAppeal(raw: unknown): SafetyAppealValidation {
  if (!raw || typeof raw !== "object") return { valid: false, errors: ["Appeal reason is required."] };
  const value = (raw as Record<string, unknown>).reason;
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < 20 || reason.length > 2000) {
    return { valid: false, errors: ["Explain the appeal using 20 to 2000 characters."] };
  }
  return { valid: true, reason };
}
