/**
 * Pure, framework-free helpers for surfacing create-event validation problems
 * (CX-20260701-event-create-error-recovery-whack-a-mole).
 *
 * The create-event form previously relied on native HTML5 `required` validation
 * (so an incomplete Publish was silently blocked by the browser with an
 * easily-missed bubble) and, for server rejections, showed only `errors[0]`.
 * That produced two failure modes:
 *   1. Publish "does nothing" — native validation blocks submit before any
 *      app-level message renders.
 *   2. Whack-a-mole — the API returns every problem as `errors[]`, but the
 *      client showed one at a time, costing a round-trip per mistake.
 *
 * These helpers pin the copy and the message → field mapping so `CreateEventForm`
 * can render one calm summary of everything that needs attention, tie each
 * problem to a field, and move focus to the first one. They are deliberately DOM-
 * free so they can be unit-tested at the lib layer (a live submit round-trip is
 * IP-rate-limited during QA).
 *
 * The server (`validateEventCreation` in `@sport-date/domain`) stays
 * authoritative: this module never relaxes a rule, it only makes failing one
 * visible and recoverable.
 */

/**
 * The ordered set of form fields that can be flagged, top-to-bottom in the DOM.
 * `name` matches the input's `name`/`id`; `label` is the calm host-voice label
 * used in the summary. Order matters: the summary and first-focus follow it so a
 * host is always taken to the earliest problem on the page.
 */
export const EVENT_FIELD_ORDER = [
  "sport",
  "title",
  "description",
  "startsAt",
  "durationMinutes",
  "capacity",
  "language",
  "experienceLevels",
  "minimumAge",
  "maximumAge",
  "city",
  "countryCode",
  "areaLabel",
  "venueName",
  "address",
  "instructions",
] as const;

export type EventFieldName = (typeof EVENT_FIELD_ORDER)[number];

/**
 * The create-event form is one form with one submit, but a first-time host meets
 * ~18 fields. To give a calm sense of structure and "where am I / what's left"
 * (CX-20260701-event-create-form-no-step-progress-friction) WITHOUT turning it
 * into a multi-step wizard (which would add clicks and risk losing entered data),
 * we group the existing fields into a small number of ordered, self-explanatory
 * sections. This metadata is the single source of truth so the section headings,
 * the progress rail, and the per-section validation routing can never drift apart.
 *
 * `fields` for the location section is intentionally the union of the public and
 * private location fields — the DOM still renders the public/private separation
 * exactly as before; this only groups them under one progress step for the host's
 * mental model. The public↔private separation and copy are unchanged.
 */
export type EventFormSection = Readonly<{
  /** Stable id used for the section landmark, heading, and progress-rail anchor. */
  id: string;
  /** Short label shown in the progress rail (e.g. "The invitation"). */
  label: string;
  /** The fields, in DOM order, that belong to this section. */
  fields: readonly EventFieldName[];
}>;

export const EVENT_FORM_SECTIONS: readonly EventFormSection[] = [
  {
    id: "invitation",
    label: "The invitation",
    fields: ["sport", "title", "description"],
  },
  {
    id: "rhythm",
    label: "The rhythm",
    fields: [
      "startsAt",
      "durationMinutes",
      "capacity",
      "language",
      "experienceLevels",
      "minimumAge",
      "maximumAge",
    ],
  },
  {
    id: "location",
    label: "Where you'll meet",
    fields: ["city", "countryCode", "areaLabel", "venueName", "address", "instructions"],
  },
] as const;

/** How many ordered sections the host moves through. */
export const EVENT_FORM_SECTION_COUNT = EVENT_FORM_SECTIONS.length;

/**
 * Calm "Section N of M" label for a section's own indicator. `index` is
 * zero-based (the section's position in `EVENT_FORM_SECTIONS`).
 */
export function sectionProgressLabel(index: number): string {
  return `Section ${index + 1} of ${EVENT_FORM_SECTION_COUNT}`;
}

/** The section a field belongs to, or `null` for a form-wide/unmapped field. */
export function sectionForField(field: EventFieldName | null): EventFormSection | null {
  if (field === null) return null;
  return EVENT_FORM_SECTIONS.find((section) => section.fields.includes(field)) ?? null;
}

/**
 * The set of section ids that currently have at least one flagged field, so the
 * form can quietly mark which sections still need the host's attention. Purely
 * informative — never a blocker. Order follows `EVENT_FORM_SECTIONS`.
 */
export function sectionsNeedingAttention(
  issues: readonly EventFieldIssue[],
): readonly string[] {
  const flagged = new Set<string>();
  for (const issue of issues) {
    const section = sectionForField(issue.field);
    if (section) flagged.add(section.id);
  }
  return EVENT_FORM_SECTIONS.filter((section) => flagged.has(section.id)).map(
    (section) => section.id,
  );
}

const FIELD_LABELS: Record<EventFieldName, string> = {
  sport: "Sport",
  title: "Event name",
  description: "Description",
  startsAt: "Starts at",
  durationMinutes: "Duration in minutes",
  capacity: "Total places",
  language: "Event language",
  experienceLevels: "Experience levels welcome",
  minimumAge: "Minimum age",
  maximumAge: "Maximum age",
  city: "City",
  countryCode: "Country code",
  areaLabel: "Area or neighborhood",
  venueName: "Venue name",
  address: "Exact address",
  instructions: "Arrival instructions",
};

export function eventFieldLabel(field: EventFieldName): string {
  return FIELD_LABELS[field];
}

/** A single problem to show the host, tied to a field where one exists. */
export type EventFieldIssue = Readonly<{
  /** The field to focus/scroll to, or `null` for a form-wide problem. */
  field: EventFieldName | null;
  /** Calm host-voice message. */
  message: string;
}>;

/**
 * Map a server validation string (from `validateEventCreation`) to the field a
 * host should be taken to. Unknown strings map to `null` (form-wide) so a new
 * server rule is still surfaced — never swallowed — even before it is mapped.
 */
export function fieldForServerMessage(message: string): EventFieldName | null {
  const text = message.toLowerCase();
  if (text.includes("start")) return "startsAt";
  if (text.includes("time zone")) return "startsAt";
  if (text.includes("description")) return "description";
  if (text.includes("title")) return "title";
  if (text.includes("sport")) return "sport";
  if (text.includes("duration")) return "durationMinutes";
  if (text.includes("capacity")) return "capacity";
  if (text.includes("experience level")) return "experienceLevels";
  if (text.includes("language")) return "language";
  if (text.includes("age range") || text.includes("age")) return "minimumAge";
  if (text.includes("country code")) return "countryCode";
  if (text.includes("city")) return "city";
  if (text.includes("public area") || text.includes("area")) return "areaLabel";
  if (text.includes("venue")) return "venueName";
  if (text.includes("address")) return "address";
  if (text.includes("instructions")) return "instructions";
  return null;
}

/**
 * Turn the API `errors[]` array into an ordered, field-tied issue list.
 *
 * Every server error is surfaced (no `errors[0]`-only truncation). Field-tied
 * issues are ordered by their position on the page so focus lands on the
 * earliest problem; unmapped/form-wide messages are appended after.
 */
export function issuesFromServerErrors(errors: readonly string[]): EventFieldIssue[] {
  const mapped = errors.map((message) => ({ field: fieldForServerMessage(message), message }));
  const fieldIndex = (field: EventFieldName | null): number =>
    field === null ? Number.POSITIVE_INFINITY : EVENT_FIELD_ORDER.indexOf(field);
  return mapped
    .map((issue, order) => ({ issue, order }))
    .sort((a, b) => {
      const byField = fieldIndex(a.issue.field) - fieldIndex(b.issue.field);
      return byField !== 0 ? byField : a.order - b.order;
    })
    .map(({ issue }) => issue);
}

/**
 * Calm host-voice message shown at the top of the form when a submit is blocked
 * because required details are still empty (native `required` validation would
 * otherwise silently block with a browser bubble).
 */
export const REQUIRED_FIELDS_SUMMARY_MESSAGE =
  "A few required details are still empty below — please complete them to publish.";

/** Message shown above the empty-required list, per count, in host voice. */
export function requiredFieldsHeadline(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "One required detail still needs your attention:";
  return `${count} required details still need your attention:`;
}

// datetime-local values are wall-clock, minute-precision, with no timezone
// suffix: "YYYY-MM-DDTHH:mm". `min` must be written the same way, in the host's
// local time, or the browser compares against a UTC-shifted instant.
function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Local-time `min` for the start-time `datetime-local` input so a past time
 * cannot be picked in the native picker.
 *
 * We floor to the current minute (datetime-local has minute precision) so a
 * valid "right now / next minute" choice is never rejected by sub-minute
 * rounding — the picker only offers whole minutes, and the server remains the
 * authoritative "must start in the future" check.
 */
export function datetimeLocalMin(now: Date = new Date()): string {
  return (
    `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}` +
    `T${pad2(now.getHours())}:${pad2(now.getMinutes())}`
  );
}

/**
 * Whether a chosen `datetime-local` string is in the past (client-side guard).
 * Empty / unparseable values are NOT treated as "past" — emptiness is handled by
 * the required-field path so the messages don't double up. Equal-to-now is
 * treated as past (an event must start strictly in the future, matching the
 * server rule).
 */
export function isPastLocalDateTime(value: string, now: Date = new Date()): boolean {
  if (!value) return false;
  const chosen = new Date(value);
  if (Number.isNaN(chosen.getTime())) return false;
  // Compare at minute precision to match the picker's granularity, so a value
  // equal to the current minute is allowed while an earlier minute is rejected.
  const chosenMinute = Math.floor(chosen.getTime() / 60000);
  const nowMinute = Math.floor(now.getTime() / 60000);
  return chosenMinute < nowMinute;
}

/** Calm host-voice message for a start time chosen in the past. */
export const PAST_START_TIME_MESSAGE =
  "That start time has already passed — choose a time in the future so people can still join.";
