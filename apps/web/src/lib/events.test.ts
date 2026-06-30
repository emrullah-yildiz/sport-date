import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { eventLanguageMatchesMemberPreference, memberSkillMatchesEvent, selectHostedEvents, type MemberEventSummary } from "./events";

// These cases pin the discovery language-preference rule that the SQL clause in
// `getDiscoverableEvents` mirrors. The bug (CX-20260630): a brand-new member has
// an empty `languages` set (signup never collects one) and the old strict
// language-overlap filter hid every otherwise-compatible event, leaving the
// discovery feed permanently and silently empty.
describe("discovery language preference", () => {
  it("shows a matching event to a member who has set no languages (previously hidden)", () => {
    // Empty preference => no language filter applied; the event the new member
    // could not see before now matches.
    expect(eventLanguageMatchesMemberPreference([], "English")).toBe(true);
    expect(eventLanguageMatchesMemberPreference([], "Romanian")).toBe(true);
  });

  it("still filters to overlapping languages for a member who has set a language (no regression)", () => {
    // A member with a stated preference keeps the exact overlap behaviour.
    expect(eventLanguageMatchesMemberPreference(["English"], "English")).toBe(true);
    expect(eventLanguageMatchesMemberPreference(["english"], "English")).toBe(true);
    expect(eventLanguageMatchesMemberPreference(["Romanian", "French"], "English")).toBe(false);
    expect(eventLanguageMatchesMemberPreference(["Romanian"], "English")).toBe(false);
  });
});

// Pins the discovery skill-matching rule that the SQL skill clause in
// `getDiscoverableEvents` (and the join gate in `createEventJoinRequest`) mirrors.
// The bug (CX-20260701): events default to `experienceLevels=[beginner,
// intermediate]` and the old `skill_level = ANY(experience_levels)` exact match
// hid EVERY default event from an `advanced` member, leaving them an empty,
// unexplained discover feed. The owner decision: inclusive upward matching — a
// stronger player can join an easier game — without loosening any other gate.
describe("discovery skill matching", () => {
  const DEFAULT_EVENT = ["beginner", "intermediate"] as const;

  it("shows a default-level (beginner/intermediate) event to an advanced member (the bug)", () => {
    // The reported case: advanced skill previously matched no default event.
    expect(memberSkillMatchesEvent("advanced", [...DEFAULT_EVENT])).toBe(true);
  });

  it("still matches the levels that already worked (no regression for beginner/intermediate)", () => {
    expect(memberSkillMatchesEvent("beginner", [...DEFAULT_EVENT])).toBe(true);
    expect(memberSkillMatchesEvent("intermediate", [...DEFAULT_EVENT])).toBe(true);
  });

  it("lets a stronger player into an easier game (matches up the ladder)", () => {
    expect(memberSkillMatchesEvent("intermediate", ["beginner"])).toBe(true);
    expect(memberSkillMatchesEvent("advanced", ["beginner"])).toBe(true);
    expect(memberSkillMatchesEvent("advanced", ["intermediate"])).toBe(true);
  });

  it("does NOT admit an under-qualified member (the event's listed floor still gates)", () => {
    // The fix loosens only UPWARD; a beginner is not slipped into an advanced-only
    // game, so nothing the host barred by skill leaks in.
    expect(memberSkillMatchesEvent("beginner", ["intermediate"])).toBe(false);
    expect(memberSkillMatchesEvent("beginner", ["advanced"])).toBe(false);
    expect(memberSkillMatchesEvent("intermediate", ["advanced"])).toBe(false);
  });

  it("matches the easiest welcomed level when an event lists a non-contiguous range", () => {
    // Floor is the minimum welcomed level, so anyone at/above beginner matches.
    expect(memberSkillMatchesEvent("intermediate", ["beginner", "advanced"])).toBe(true);
    expect(memberSkillMatchesEvent("beginner", ["beginner", "advanced"])).toBe(true);
  });

  it("is case- and whitespace-insensitive and rejects unknown skill values", () => {
    expect(memberSkillMatchesEvent("  Advanced ", ["Beginner", "Intermediate"])).toBe(true);
    expect(memberSkillMatchesEvent("expert", [...DEFAULT_EVENT])).toBe(false);
    expect(memberSkillMatchesEvent("advanced", [])).toBe(false);
  });
});

// Pins the data wiring for the "Your events" hosting page (CX-20260701): it reuses
// the existing `getMemberEventSummaries()` query (which returns the member's hosted
// AND joined events) and must show only the events the member hosts, split into
// upcoming vs past — never another member's events.
describe("hosting page hosted-event selection", () => {
  const summary = (over: Partial<MemberEventSummary>): MemberEventSummary => ({
    id: "e1", title: "Morning run", sport: "Running", startsAt: "2026-07-10T07:00:00Z",
    timeZone: "Europe/Bucharest", city: "Bucharest", areaLabel: "Herastrau",
    isHost: true, hasEnded: false, reflection: null, ...over,
  });

  it("keeps only events the member hosts (excludes events they merely joined)", () => {
    const hosted = selectHostedEvents([
      summary({ id: "host-1", isHost: true }),
      summary({ id: "joined-1", isHost: false }),
    ]);
    expect(hosted.map((event) => event.id)).toEqual(["host-1"]);
  });

  it("classifies a not-yet-ended hosted event as upcoming and an ended one as past", () => {
    const hosted = selectHostedEvents([
      summary({ id: "future", isHost: true, hasEnded: false }),
      summary({ id: "done", isHost: true, hasEnded: true }),
    ]);
    expect(hosted.find((event) => event.id === "future")?.hostedStatus).toBe("upcoming");
    expect(hosted.find((event) => event.id === "done")?.hostedStatus).toBe("past");
  });

  it("returns an empty list when the member hosts nothing", () => {
    expect(selectHostedEvents([summary({ isHost: false })])).toEqual([]);
    expect(selectHostedEvents([])).toEqual([]);
  });
});
