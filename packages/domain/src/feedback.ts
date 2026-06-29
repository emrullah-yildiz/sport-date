export const FEEDBACK_CATEGORIES = [
  "bug",
  "missing_feature",
  "usability",
  "accessibility",
  "performance",
  "content",
  "suggestion",
  "other",
] as const;

export const FEEDBACK_SURFACES = ["web", "mobile"] as const;
export const FEEDBACK_SEVERITIES = ["low", "medium", "high", "blocker"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackSurface = (typeof FEEDBACK_SURFACES)[number];
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];

export type FeedbackTicketInput = Readonly<{
  category: FeedbackCategory;
  surface: FeedbackSurface;
  summary: string;
  details: string;
  currentPath: string;
  expectedOutcome: string | null;
  actualOutcome: string | null;
  severity: FeedbackSeverity;
}>;

export type FeedbackTicketValidation =
  | { valid: true; data: FeedbackTicketInput }
  | { valid: false; errors: readonly string[] };

const CREDENTIAL_PATTERN = /(?:\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:password|passcode|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization)\s*[:=]\s*\S+)/i;
const COORDINATE_PATTERN = /(?:^|[^\d])[-+]?\d{1,2}\.\d{4,}\s*[,;]\s*[-+]?\d{1,3}\.\d{4,}(?:$|[^\d])/;
const MAP_PIN_PATTERN = /(?:google\.[^\s/]+\/maps|maps\.apple\.com|openstreetmap\.org).*(?:[?/#]|%2C)/i;

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function containsRestrictedPrivateData(value: string): boolean {
  return CREDENTIAL_PATTERN.test(value) || COORDINATE_PATTERN.test(value) || MAP_PIN_PATTERN.test(value);
}

export function validateFeedbackTicket(raw: unknown): FeedbackTicketValidation {
  if (!raw || typeof raw !== "object") return { valid: false, errors: ["Feedback details are required."] };
  const input = raw as Record<string, unknown>;
  const category = input.category;
  const surface = input.surface;
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const details = typeof input.details === "string" ? input.details.trim() : "";
  const currentPath = typeof input.currentPath === "string" ? input.currentPath.trim() : "";
  const expectedOutcome = optionalText(input.expectedOutcome);
  const actualOutcome = optionalText(input.actualOutcome);
  const severity = input.severity;
  const errors: string[] = [];

  if (!FEEDBACK_CATEGORIES.includes(category as FeedbackCategory)) errors.push("Choose a valid feedback category.");
  if (!FEEDBACK_SURFACES.includes(surface as FeedbackSurface)) errors.push("Choose web or mobile as the affected surface.");
  if (summary.length < 10 || summary.length > 160) errors.push("Summarize the experience using 10 to 160 characters.");
  if (details.length < 20 || details.length > 4000) errors.push("Describe the experience using 20 to 4000 characters.");
  if (currentPath.length < 1 || currentPath.length > 200) errors.push("Name the affected path or screen using 1 to 200 characters.");
  if (currentPath.includes("?") || currentPath.includes("#")) errors.push("Remove query parameters and fragments from the path or screen name.");
  if (input.expectedOutcome !== undefined && input.expectedOutcome !== null && typeof input.expectedOutcome !== "string") errors.push("Expected outcome must be text.");
  if (input.actualOutcome !== undefined && input.actualOutcome !== null && typeof input.actualOutcome !== "string") errors.push("Actual outcome must be text.");
  if (expectedOutcome && expectedOutcome.length > 1000) errors.push("Keep the expected outcome under 1000 characters.");
  if (actualOutcome && actualOutcome.length > 1000) errors.push("Keep the actual outcome under 1000 characters.");
  if (!FEEDBACK_SEVERITIES.includes(severity as FeedbackSeverity)) errors.push("Choose a valid impact severity.");

  const submittedText = [summary, details, currentPath, expectedOutcome ?? "", actualOutcome ?? ""].join("\n");
  if (containsRestrictedPrivateData(submittedText)) {
    errors.push("Remove credentials, precise coordinates, or map pins before submitting feedback.");
  }

  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    data: {
      category: category as FeedbackCategory,
      surface: surface as FeedbackSurface,
      summary,
      details,
      currentPath,
      expectedOutcome,
      actualOutcome,
      severity: severity as FeedbackSeverity,
    },
  };
}
