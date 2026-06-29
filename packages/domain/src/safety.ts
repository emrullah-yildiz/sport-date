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

export const MODERATION_CASE_STATUSES = ["triaged", "investigating", "actioned", "dismissed"] as const;
export const MODERATION_DECISION_CODES = [
  "no_action", "warning", "event_removal", "feature_restriction",
  "temporary_suspension", "permanent_removal", "external_escalation",
] as const;
export type ModerationCaseStatus = (typeof MODERATION_CASE_STATUSES)[number];
export type ModerationDecisionCode = (typeof MODERATION_DECISION_CODES)[number];
export type ModerationCaseUpdateValidation =
  | { valid: true; status: ModerationCaseStatus; decisionCode: ModerationDecisionCode | null; decisionBasis: string | null; decisionSummary: string | null }
  | { valid: false; errors: readonly string[] };
export const MODERATION_APPEAL_STATUSES = ["reviewing", "upheld", "modified", "reversed"] as const;
export type ModerationAppealStatus = (typeof MODERATION_APPEAL_STATUSES)[number];
export type ModerationAppealUpdateValidation =
  | { valid: true; status: ModerationAppealStatus; outcomeSummary: string | null }
  | { valid: false; errors: readonly string[] };

export const EVIDENCE_SOURCE_TYPES = ["system_record", "member_statement", "external_case", "law_enforcement_request"] as const;
export const EVIDENCE_SENSITIVITIES = ["restricted", "high"] as const;
export const EVIDENCE_REVIEW_DAYS = [30, 90, 180] as const;
export type EvidenceReferenceValidation =
  | {
    valid: true;
    sourceType: (typeof EVIDENCE_SOURCE_TYPES)[number];
    sensitivity: (typeof EVIDENCE_SENSITIVITIES)[number];
    label: string;
    referenceKey: string;
    preservationPurpose: string;
    reviewAfterDays: (typeof EVIDENCE_REVIEW_DAYS)[number];
  }
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

export function validateModerationCaseUpdate(raw: unknown): ModerationCaseUpdateValidation {
  if (!raw || typeof raw !== "object") return { valid: false, errors: ["Case update is required."] };
  const input = raw as Record<string, unknown>;
  const status = input.status;
  const decisionCode = input.decisionCode;
  const decisionBasis = typeof input.decisionBasis === "string" ? input.decisionBasis.trim() : "";
  const decisionSummary = typeof input.decisionSummary === "string" ? input.decisionSummary.trim() : "";
  const errors: string[] = [];
  if (!MODERATION_CASE_STATUSES.includes(status as ModerationCaseStatus)) errors.push("Choose a valid case status.");
  const terminal = status === "actioned" || status === "dismissed";
  if (terminal) {
    if (!MODERATION_DECISION_CODES.includes(decisionCode as ModerationDecisionCode)) errors.push("Choose a valid decision.");
    if (decisionBasis.length < 10 || decisionBasis.length > 500) errors.push("Name the policy rule or legal basis using 10 to 500 characters.");
    if (decisionSummary.length < 20 || decisionSummary.length > 2000) errors.push("Write a reporter-safe decision summary using 20 to 2000 characters.");
  } else if (decisionCode || decisionBasis || decisionSummary) {
    errors.push("Only a final case state can include a decision notice.");
  }
  if (status === "dismissed" && decisionCode !== "no_action") errors.push("A dismissed report must use the no-action decision.");
  if (status === "actioned" && decisionCode === "no_action") errors.push("An actioned report must describe an action.");
  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    status: status as ModerationCaseStatus,
    decisionCode: terminal ? decisionCode as ModerationDecisionCode : null,
    decisionBasis: terminal ? decisionBasis : null,
    decisionSummary: terminal ? decisionSummary : null,
  };
}

export function validateModerationAppealUpdate(raw: unknown): ModerationAppealUpdateValidation {
  if (!raw || typeof raw !== "object") return { valid: false, errors: ["Appeal update is required."] };
  const input = raw as Record<string, unknown>;
  const status = input.status;
  const outcomeSummary = typeof input.outcomeSummary === "string" ? input.outcomeSummary.trim() : "";
  const errors: string[] = [];
  if (!MODERATION_APPEAL_STATUSES.includes(status as ModerationAppealStatus)) errors.push("Choose a valid appeal status.");
  const final = status === "upheld" || status === "modified" || status === "reversed";
  if (final && (outcomeSummary.length < 20 || outcomeSummary.length > 2000)) {
    errors.push("Write a reporter-safe appeal outcome using 20 to 2000 characters.");
  } else if (!final && outcomeSummary) {
    errors.push("Only a final appeal state can include an outcome notice.");
  }
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, status: status as ModerationAppealStatus, outcomeSummary: final ? outcomeSummary : null };
}

export function validateEvidenceReference(raw: unknown): EvidenceReferenceValidation {
  if (!raw || typeof raw !== "object") return { valid: false, errors: ["Evidence reference is required."] };
  const input = raw as Record<string, unknown>;
  const sourceType = input.sourceType;
  const sensitivity = input.sensitivity;
  const label = typeof input.label === "string" ? input.label.trim() : "";
  const referenceKey = typeof input.referenceKey === "string" ? input.referenceKey.trim() : "";
  const preservationPurpose = typeof input.preservationPurpose === "string" ? input.preservationPurpose.trim() : "";
  const reviewAfterDays = input.reviewAfterDays;
  const errors: string[] = [];
  if (!EVIDENCE_SOURCE_TYPES.includes(sourceType as (typeof EVIDENCE_SOURCE_TYPES)[number])) errors.push("Choose a valid evidence source.");
  if (!EVIDENCE_SENSITIVITIES.includes(sensitivity as (typeof EVIDENCE_SENSITIVITIES)[number])) errors.push("Choose a valid sensitivity.");
  if (label.length < 10 || label.length > 160) errors.push("Describe the reference using 10 to 160 characters.");
  if (referenceKey.length < 8 || referenceKey.length > 200 || !/^[A-Za-z0-9][A-Za-z0-9._:/#-]+$/.test(referenceKey)) {
    errors.push("Use an opaque 8 to 200 character locator without spaces, query strings, or credentials.");
  }
  if (preservationPurpose.length < 20 || preservationPurpose.length > 500) errors.push("State the preservation purpose using 20 to 500 characters.");
  if (!EVIDENCE_REVIEW_DAYS.includes(reviewAfterDays as (typeof EVIDENCE_REVIEW_DAYS)[number])) errors.push("Choose a valid retention review interval.");
  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    sourceType: sourceType as (typeof EVIDENCE_SOURCE_TYPES)[number],
    sensitivity: sensitivity as (typeof EVIDENCE_SENSITIVITIES)[number],
    label,
    referenceKey,
    preservationPurpose,
    reviewAfterDays: reviewAfterDays as (typeof EVIDENCE_REVIEW_DAYS)[number],
  };
}
