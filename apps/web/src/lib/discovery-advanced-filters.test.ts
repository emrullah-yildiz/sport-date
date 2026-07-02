import { describe, expect, it } from "vitest";

import {
  ALL_RADIUS_OPTIONS_KM,
  PLUS_RADIUS_OPTIONS_KM,
  applyAdvancedFilters,
  eventMatchesLanguages,
  eventMatchesSchedule,
  NO_ADVANCED_FILTERS,
  parseAdvancedLanguages,
  parsePlusRadiusKm,
  parseScheduleWindow,
  resolveAdvancedFilters,
} from "./discovery-advanced-filters";
import { RADIUS_OPTIONS_KM } from "./discovery-geo";

// These pin the FIRST PLUS PERK's gate + fail-closed behaviour and prove that a free
// (or unconfirmable) member keeps a fully-usable baseline discovery with nothing
// silently excluded (CX-20260701-plus-perks-advanced-discovery-filters).

// A Bucharest event; morning local start (UTC+3 in summer -> 07:00 local).
const morningEvent = { startsAt: "2026-07-03T04:00:00.000Z", timeZone: "Europe/Bucharest", language: "English" }; // Fri 07:00
const eveningEvent = { startsAt: "2026-07-03T17:00:00.000Z", timeZone: "Europe/Bucharest", language: "Romanian" }; // Fri 20:00
const weekendEvent = { startsAt: "2026-07-04T09:00:00.000Z", timeZone: "Europe/Bucharest", language: "English" }; // Sat 12:00
const allEvents = [morningEvent, eveningEvent, weekendEvent];

describe("advanced-discovery-filters gate (Plus perk) fails closed to FREE", () => {
  it("a FREE member gets NO advanced facets even with every advanced param set", () => {
    const advanced = resolveAdvancedFilters(false, {
      radius: "10",
      schedule: "evening",
      languages: ["English", "Romanian"],
    });
    expect(advanced).toEqual(NO_ADVANCED_FILTERS);
    expect(advanced.anyActive).toBe(false);
    // And applying the (inactive) filters leaves the full eligible feed untouched —
    // nothing is silently excluded for a free member.
    expect(applyAdvancedFilters(allEvents, advanced)).toEqual(allEvents);
  });

  it("an unknown / unconfirmable entitlement (plus=false) is treated exactly as FREE", () => {
    // The surface computes `plus` via the fail-closed entitlement helper; whatever it
    // could not confirm arrives here as false, and the perk simply does not apply.
    const advanced = resolveAdvancedFilters(false, { schedule: "morning" });
    expect(advanced.schedule).toBeNull();
    expect(applyAdvancedFilters(allEvents, advanced)).toEqual(allEvents);
  });

  it("a PLUS member gets the advanced facets honoured", () => {
    const advanced = resolveAdvancedFilters(true, {
      radius: "10",
      schedule: "evening",
      languages: ["Romanian"],
    });
    expect(advanced.radiusKm).toBe(10);
    expect(advanced.schedule).toBe("evening");
    expect(advanced.languages).toEqual(["Romanian"]);
    expect(advanced.anyActive).toBe(true);
  });

  it("a PLUS member with no advanced selections still gets the full feed (facets only narrow at request)", () => {
    const advanced = resolveAdvancedFilters(true, {});
    expect(advanced.anyActive).toBe(false);
    expect(applyAdvancedFilters(allEvents, advanced)).toEqual(allEvents);
  });
});

describe("finer Plus radius bands", () => {
  it("exposes the free bands plus the finer Plus bands, sorted, de-duplicated", () => {
    for (const km of RADIUS_OPTIONS_KM) expect(ALL_RADIUS_OPTIONS_KM).toContain(km);
    for (const km of PLUS_RADIUS_OPTIONS_KM) expect(ALL_RADIUS_OPTIONS_KM).toContain(km);
    expect([...ALL_RADIUS_OPTIONS_KM]).toEqual([...ALL_RADIUS_OPTIONS_KM].sort((a, b) => a - b));
    expect(new Set(ALL_RADIUS_OPTIONS_KM).size).toBe(ALL_RADIUS_OPTIONS_KM.length);
  });

  it("parsePlusRadiusKm accepts a finer band and rejects an unknown value", () => {
    expect(parsePlusRadiusKm("10")).toBe(10);
    expect(parsePlusRadiusKm("25")).toBe(25); // a free band is still valid
    expect(parsePlusRadiusKm("7")).toBeNull();
    expect(parsePlusRadiusKm("")).toBeNull();
    expect(parsePlusRadiusKm(null)).toBeNull();
  });
});

describe("schedule / time-of-day matcher (event's own time zone)", () => {
  it("null window (any time) matches every event", () => {
    for (const event of allEvents) expect(eventMatchesSchedule(event, null)).toBe(true);
  });

  it("morning matches a 07:00 local start, not a 20:00 one", () => {
    expect(eventMatchesSchedule(morningEvent, "morning")).toBe(true);
    expect(eventMatchesSchedule(eveningEvent, "morning")).toBe(false);
  });

  it("evening matches a 20:00 local start, not a 07:00 one", () => {
    expect(eventMatchesSchedule(eveningEvent, "evening")).toBe(true);
    expect(eventMatchesSchedule(morningEvent, "evening")).toBe(false);
  });

  it("weekend matches a Saturday/Sunday local start, not a Friday one", () => {
    expect(eventMatchesSchedule(weekendEvent, "weekend")).toBe(true);
    expect(eventMatchesSchedule(morningEvent, "weekend")).toBe(false);
  });

  it("an unparseable start / bad time zone is never silently hidden (errs to include)", () => {
    expect(eventMatchesSchedule({ startsAt: "not-a-date", timeZone: "Europe/Bucharest" }, "morning")).toBe(true);
    expect(eventMatchesSchedule({ startsAt: morningEvent.startsAt, timeZone: "Not/AZone" }, "evening")).toBe(true);
  });

  it("parseScheduleWindow only accepts known windows", () => {
    expect(parseScheduleWindow("morning")).toBe("morning");
    expect(parseScheduleWindow("WEEKEND")).toBe("weekend");
    expect(parseScheduleWindow("whenever")).toBeNull();
    expect(parseScheduleWindow("")).toBeNull();
  });
});

describe("multi-language matcher only narrows at the member's request", () => {
  it("empty selection matches everything (no narrowing)", () => {
    for (const event of allEvents) expect(eventMatchesLanguages(event, [])).toBe(true);
  });

  it("selection matches an event whose language is any of the chosen ones (case-insensitive)", () => {
    expect(eventMatchesLanguages(morningEvent, ["english"])).toBe(true);
    expect(eventMatchesLanguages(eveningEvent, ["English", "Romanian"])).toBe(true);
    expect(eventMatchesLanguages(morningEvent, ["Romanian"])).toBe(false);
  });

  it("parseAdvancedLanguages trims, de-dupes case-insensitively, drops blanks, and caps count", () => {
    expect(parseAdvancedLanguages("English, romanian, English, ,")).toEqual(["English", "romanian"]);
    expect(parseAdvancedLanguages(["English", "English"])).toEqual(["English"]);
    expect(parseAdvancedLanguages("a,b,c,d,e,f,g,h").length).toBe(6);
    expect(parseAdvancedLanguages(null)).toEqual([]);
  });
});

describe("applyAdvancedFilters is additive narrowing only", () => {
  it("a Plus member narrowing to weekend + English keeps only the matching eligible event", () => {
    const advanced = resolveAdvancedFilters(true, { schedule: "weekend", languages: ["English"] });
    expect(applyAdvancedFilters(allEvents, advanced)).toEqual([weekendEvent]);
  });

  it("never adds an event that was not in the eligible input (cannot widen eligibility)", () => {
    const advanced = resolveAdvancedFilters(true, { languages: ["English", "Romanian", "French"] });
    const result = applyAdvancedFilters(allEvents, advanced);
    for (const event of result) expect(allEvents).toContain(event);
  });
});
