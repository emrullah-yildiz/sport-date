export const EVENT_UPDATE_FIELD_LABELS = {
  sport: "sport",
  title: "name",
  description: "description",
  startsAt: "start time",
  durationMinutes: "duration",
  capacity: "places",
  language: "language",
  experienceLevels: "welcome skill levels",
  participantAgeRange: "age range",
  publicLocation: "public area",
  privateLocation: "exact venue",
  arrivalInstructions: "arrival instructions",
} as const;

export type EventUpdateField = keyof typeof EVENT_UPDATE_FIELD_LABELS;
export type EventUpdateSeverity = "routine" | "critical";

export type EventUpdateNotice = Readonly<{
  id: string;
  severity: EventUpdateSeverity;
  changedFields: EventUpdateField[];
  summary: string;
  createdAt: string;
}>;

const CRITICAL_EVENT_UPDATE_FIELDS: readonly EventUpdateField[] = [
  "startsAt",
  "durationMinutes",
  "publicLocation",
  "privateLocation",
  "arrivalInstructions",
] as const;

function joinLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? "details";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export function summarizeEventUpdate(changedFields: readonly EventUpdateField[]) {
  const labels = changedFields
    .map((field) => EVENT_UPDATE_FIELD_LABELS[field])
    .filter((label, index, values) => values.indexOf(label) === index);

  return `${joinLabels(labels)} updated by the host.`;
}

export function classifyEventUpdateSeverity(changedFields: readonly EventUpdateField[]): EventUpdateSeverity {
  return changedFields.some((field) => CRITICAL_EVENT_UPDATE_FIELDS.includes(field)) ? "critical" : "routine";
}

export function eventUpdateSeverityLabel(severity: EventUpdateSeverity) {
  return severity === "critical" ? "critical change" : "routine change";
}
