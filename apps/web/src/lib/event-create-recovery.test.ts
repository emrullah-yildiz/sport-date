import { describe, expect, it } from "vitest";

import {
  datetimeLocalMin,
  EVENT_FIELD_ORDER,
  EVENT_FORM_SECTION_COUNT,
  EVENT_FORM_SECTIONS,
  EXPERIENCE_LEVELS_REQUIRED_MESSAGE,
  experienceLevelsIssue,
  fieldForServerMessage,
  isPastLocalDateTime,
  issuesFromServerErrors,
  PAST_START_TIME_MESSAGE,
  requiredFieldsHeadline,
  REQUIRED_FIELDS_SUMMARY_MESSAGE,
  sectionForField,
  sectionProgressLabel,
  sectionsNeedingAttention,
} from "./event-create-recovery";

describe("fieldForServerMessage", () => {
  it("maps each real domain validation string to a field a host can act on", () => {
    const cases: Array<[string, string]> = [
      ["Event must start in the future.", "startsAt"],
      ["Choose a valid event start time.", "startsAt"],
      ["Choose a valid IANA time zone.", "startsAt"],
      ["Event description must contain 20 to 1000 characters.", "description"],
      ["Event title must contain 1 to 100 characters.", "title"],
      ["Sport must contain 1 to 60 characters.", "sport"],
      ["Event duration must be between 15 and 480 minutes.", "durationMinutes"],
      ["Event capacity must be between 2 and 20.", "capacity"],
      ["Select at least one experience level.", "experienceLevels"],
      ["Choose valid experience levels without duplicates.", "experienceLevels"],
      ["Choose a valid event language.", "language"],
      ["Participant age range must be between 18 and 100.", "minimumAge"],
      ["Country code must contain two letters.", "countryCode"],
      ["Choose a valid city.", "city"],
      ["Add an approximate public area.", "areaLabel"],
      ["Choose a valid venue name.", "venueName"],
      ["Add a private meeting address.", "address"],
      ["Arrival instructions must be 500 characters or fewer.", "instructions"],
    ];
    for (const [message, field] of cases) {
      expect(fieldForServerMessage(message)).toBe(field);
    }
  });

  it("returns null (form-wide, still surfaced) for an unmapped message", () => {
    expect(fieldForServerMessage("Coordinates must use valid latitude and longitude ranges.")).toBeNull();
    expect(fieldForServerMessage("Something entirely new the server added.")).toBeNull();
  });
});

describe("issuesFromServerErrors", () => {
  it("surfaces EVERY server error (no errors[0]-only whack-a-mole)", () => {
    const errors = [
      "Event description must contain 20 to 1000 characters.",
      "Event must start in the future.",
    ];
    const issues = issuesFromServerErrors(errors);
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(errors));
  });

  it("orders field-tied issues top-to-bottom so focus lands on the earliest problem", () => {
    // description (index 2) precedes startsAt (index 3) precedes address (index 14).
    const issues = issuesFromServerErrors([
      "Add a private meeting address.",
      "Event must start in the future.",
      "Event description must contain 20 to 1000 characters.",
    ]);
    expect(issues.map((issue) => issue.field)).toEqual(["description", "startsAt", "address"]);
  });

  it("keeps unmapped/form-wide issues but appends them after field-tied ones", () => {
    const issues = issuesFromServerErrors([
      "Coordinates must use valid latitude and longitude ranges.",
      "Event title must contain 1 to 100 characters.",
    ]);
    expect(issues[0].field).toBe("title");
    expect(issues[1].field).toBeNull();
    expect(issues).toHaveLength(2);
  });
});

describe("datetimeLocalMin", () => {
  it("formats the current local minute as YYYY-MM-DDTHH:mm (no timezone suffix)", () => {
    const now = new Date(2026, 6, 1, 9, 5); // local time constructor
    expect(datetimeLocalMin(now)).toBe("2026-07-01T09:05");
  });

  it("zero-pads month, day, hour, and minute", () => {
    const now = new Date(2026, 0, 3, 4, 6);
    expect(datetimeLocalMin(now)).toBe("2026-01-03T04:06");
  });
});

describe("isPastLocalDateTime", () => {
  const now = new Date(2026, 6, 1, 12, 0);

  it("rejects a time before the current minute", () => {
    expect(isPastLocalDateTime("2026-07-01T11:59", now)).toBe(true);
    expect(isPastLocalDateTime("2026-06-30T23:59", now)).toBe(true);
  });

  it("allows the current minute and any future time (never blocks a valid near-future choice)", () => {
    expect(isPastLocalDateTime("2026-07-01T12:00", now)).toBe(false);
    expect(isPastLocalDateTime("2026-07-01T12:01", now)).toBe(false);
    expect(isPastLocalDateTime("2026-12-31T18:30", now)).toBe(false);
  });

  it("does not treat empty or unparseable values as past (required path handles those)", () => {
    expect(isPastLocalDateTime("", now)).toBe(false);
    expect(isPastLocalDateTime("not-a-date", now)).toBe(false);
  });
});

describe("copy + field order", () => {
  it("exposes the calm required-fields summary message", () => {
    expect(REQUIRED_FIELDS_SUMMARY_MESSAGE).toMatch(/required details are still empty/i);
  });

  it("has a distinct past-start-time message", () => {
    expect(PAST_START_TIME_MESSAGE).toMatch(/already passed/i);
  });

  it("pluralises the required-fields headline by count", () => {
    expect(requiredFieldsHeadline(0)).toBe("");
    expect(requiredFieldsHeadline(1)).toMatch(/^One required detail/);
    expect(requiredFieldsHeadline(3)).toMatch(/^3 required details/);
  });

  it("gives a calm, directive reason for an empty experience-level selection", () => {
    expect(EXPERIENCE_LEVELS_REQUIRED_MESSAGE).toMatch(/at least one experience level/i);
    expect(EXPERIENCE_LEVELS_REQUIRED_MESSAGE).toMatch(/publish/i);
  });
});

describe("experienceLevelsIssue", () => {
  it("flags an empty selection as a field-tied experience-level issue", () => {
    const issue = experienceLevelsIssue(0);
    expect(issue).toEqual({ field: "experienceLevels", message: EXPERIENCE_LEVELS_REQUIRED_MESSAGE });
  });

  it("clears (returns null) the moment at least one level is selected", () => {
    expect(experienceLevelsIssue(1)).toBeNull();
    expect(experienceLevelsIssue(3)).toBeNull();
  });

  it("ties its issue to a field the recovery summary can order and focus", () => {
    // Must be a known field in canonical page order so the summary link and
    // first-focus land on the fieldset rather than a form-wide dead end.
    expect(EVENT_FIELD_ORDER).toContain(experienceLevelsIssue(0)!.field);
  });

  it("keeps the split location fields in the canonical order (public before private)", () => {
    const cityIndex = EVENT_FIELD_ORDER.indexOf("city");
    const venueIndex = EVENT_FIELD_ORDER.indexOf("venueName");
    expect(cityIndex).toBeGreaterThan(-1);
    expect(venueIndex).toBeGreaterThan(cityIndex);
  });
});

describe("form sections (structure + progress orientation)", () => {
  it("covers every field exactly once, in canonical page order", () => {
    // The section metadata must partition EVENT_FIELD_ORDER: no field left out
    // (would appear in no section) and none duplicated (two step homes).
    const sectioned = EVENT_FORM_SECTIONS.flatMap((section) => [...section.fields]);
    expect(sectioned).toEqual([...EVENT_FIELD_ORDER]);
  });

  it("keeps the public location fields before the private ones within the location section", () => {
    const location = EVENT_FORM_SECTIONS.find((section) => section.id === "location");
    expect(location).toBeDefined();
    const fields = location!.fields;
    expect(fields.indexOf("areaLabel")).toBeLessThan(fields.indexOf("venueName"));
  });

  it("labels each section 'Section N of M' from a zero-based index", () => {
    expect(sectionProgressLabel(0)).toBe(`Section 1 of ${EVENT_FORM_SECTION_COUNT}`);
    expect(sectionProgressLabel(EVENT_FORM_SECTION_COUNT - 1)).toBe(
      `Section ${EVENT_FORM_SECTION_COUNT} of ${EVENT_FORM_SECTION_COUNT}`,
    );
  });

  it("maps a field to its owning section, and null for a form-wide problem", () => {
    expect(sectionForField("title")?.id).toBe("invitation");
    expect(sectionForField("capacity")?.id).toBe("rhythm");
    expect(sectionForField("venueName")?.id).toBe("location");
    expect(sectionForField(null)).toBeNull();
  });

  it("flags only the sections with an issue, in section order, and ignores form-wide issues", () => {
    const flagged = sectionsNeedingAttention([
      { field: "venueName", message: "Choose a valid venue name." },
      { field: "title", message: "Event title must contain 1 to 100 characters." },
      { field: null, message: "Something form-wide." },
    ]);
    // invitation (title) comes before location (venue); rhythm untouched; the
    // form-wide issue does not invent a section.
    expect(flagged).toEqual(["invitation", "location"]);
  });

  it("returns no flagged sections when there are no issues", () => {
    expect(sectionsNeedingAttention([])).toEqual([]);
  });
});
