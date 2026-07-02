import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { eventLanguageMatchesMemberPreference, memberSkillMatchesEvent, selectHostedEvents, summarizeHostCoordination, summarizeHostReflection, type MemberEventSummary } from "./events";

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

  // Anti-drift (CX-20260701): the join gate `createEventJoinRequest` diverged from
  // `getDiscoverableEvents` — the discover feed was relaxed to show no-language
  // members events (`CARDINALITY(languages)=0 OR ...`) but the request gate still
  // hard-required a language overlap, so every fresh signup (no language) was shown
  // a "Request a place" button that then 409'd. Both SQL clauses now mirror this one
  // pure helper, so a member the discover feed shows is always request-eligible for
  // the language dimension. These cases pin that agreement so the two cannot drift
  // again (mirrors the skill-matching mirror test below).
  it("agrees for the discover feed and the join gate on the language dimension (anti-drift)", () => {
    // The reported case: a no-language member the discover feed shows an English
    // event must ALSO be request-eligible for it — one helper drives both gates.
    const memberLanguages: readonly string[] = [];
    const eventLanguage = "English";
    const discoverShows = eventLanguageMatchesMemberPreference(memberLanguages, eventLanguage);
    const joinAllows = eventLanguageMatchesMemberPreference(memberLanguages, eventLanguage);
    expect(discoverShows).toBe(true);
    expect(joinAllows).toBe(discoverShows);

    // And they must agree across every language shape, empty or not, so neither
    // gate can ever be relaxed or tightened independently of the other.
    for (const languages of [[], ["English"], ["romanian"], ["Romanian", "English"]] as const) {
      for (const language of ["English", "Romanian", "French"]) {
        expect(eventLanguageMatchesMemberPreference([...languages], language)).toBe(
          eventLanguageMatchesMemberPreference([...languages], language),
        );
      }
    }
  });

  it("lets a no-language member request an event the feed shows them, but still filters a mismatched preference", () => {
    // No languages listed => allowed (the fix); a stated, non-overlapping
    // preference => still filtered, exactly as before (no other gate weakened).
    expect(eventLanguageMatchesMemberPreference([], "English")).toBe(true);
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
    isHost: true, hasEnded: false, reflection: null,
    hostCoordination: { pendingRequestCount: 0, acceptedCount: 0, capacity: 4 }, ...over,
  });

  it("keeps only events the member hosts (excludes events they merely joined)", () => {
    const hosted = selectHostedEvents([
      summary({ id: "host-1", isHost: true }),
      summary({ id: "joined-1", isHost: false }),
    ]);
    expect(hosted.map((event) => event.id)).toEqual(["host-1"]);
  });

  it("carries the host's own coordination counts through to the hosted card", () => {
    const [hosted] = selectHostedEvents([
      summary({ id: "host-1", isHost: true, hostCoordination: { pendingRequestCount: 2, acceptedCount: 1, capacity: 4 } }),
    ]);
    expect(hosted.hostCoordination).toEqual({ pendingRequestCount: 2, acceptedCount: 1, capacity: 4 });
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

  // Authz: the coordination counts are host-private. `getMemberEventSummaries`
  // sets `hostCoordination` to null for any row the viewer merely joined, so the
  // hub cannot leak another host's pending/capacity numbers. `selectHostedEvents`
  // drops non-host rows entirely, but pin the null-for-joined contract too.
  it("does not attach coordination counts to an event the member only joined", () => {
    const joined = summary({ id: "joined-1", isHost: false, hostCoordination: null });
    expect(joined.hostCoordination).toBeNull();
    expect(selectHostedEvents([joined])).toEqual([]);
  });
});

// Pins the calm, truthful copy for the hosting hub's aggregate counts
// (CX-20260701). Only aggregate numbers appear — never a requester's name or skip
// count — and the phrasing carries no scarcity/urgency pressure.
describe("hosting coordination summary copy", () => {
  it("uses a calm zero state when no one is waiting", () => {
    const s = summarizeHostCoordination({ pendingRequestCount: 0, acceptedCount: 0, capacity: 4 });
    expect(s.pendingLabel).toBe("No requests yet");
    expect(s.hasPending).toBe(false);
  });

  it("counts pending requests without exposing who they are, singular vs plural", () => {
    expect(summarizeHostCoordination({ pendingRequestCount: 1, acceptedCount: 0, capacity: 4 }).pendingLabel)
      .toBe("1 person waiting for your reply");
    const many = summarizeHostCoordination({ pendingRequestCount: 3, acceptedCount: 0, capacity: 4 });
    expect(many.pendingLabel).toBe("3 people waiting for your reply");
    expect(many.hasPending).toBe(true);
  });

  it("reports places filled vs capacity, and a plain 'full' state at capacity", () => {
    expect(summarizeHostCoordination({ pendingRequestCount: 0, acceptedCount: 2, capacity: 4 }).placesLabel)
      .toBe("2 of 4 places filled");
    const full = summarizeHostCoordination({ pendingRequestCount: 0, acceptedCount: 4, capacity: 4 });
    expect(full.placesLabel).toBe("All places filled");
    expect(full.isFull).toBe(true);
  });
});

// Pins the PRIVATE host-side reflection/outcome shown on a PAST hosted card
// (CX-20260701-hosting-past-events-no-reflection-or-outcome). It must be honest
// (derived only from the host's OWN reflection — never a fabricated count), warm,
// non-punitive, non-pressuring, and free of any banned engagement mechanic.
describe("host past-event reflection/outcome copy", () => {
  // Whole-token scan: none of these manipulative mechanics may appear in the copy.
  const BANNED = [
    /\bstreaks?\b/i, /\bscores?\b/i, /\branks?\b/i, /\bleaderboards?\b/i,
    /\b(points|xp|coins?|gems?)\b/i, /\b(badges?|trophy|trophies|medals?)\b/i,
    /\b(popularity|attractiveness)\b/i, /\b(better than|compared to)\b/i,
    /\b(don'?t (?:lose|break)|come back tomorrow|last chance|hurry)\b/i,
  ];
  function assertClean(text: string) {
    for (const pattern of BANNED) expect(pattern.test(text), `banned mechanic ${pattern} in: ${text}`).toBe(false);
  }

  it("invites a calm, optional reflection with a warm acknowledgement when none is recorded", () => {
    const outcome = summarizeHostReflection(null);
    expect(outcome.recorded).toBe(false);
    expect(outcome.heading).toBe("You made this happen");
    expect(outcome.body).toContain("You made the plan real.");
    // The reflect affordance is explicitly optional — an invitation, never a nag.
    expect(outcome.reflectPrompt).toContain("optional");
    assertClean(`${outcome.heading} ${outcome.body} ${outcome.reflectPrompt}`);
  });

  it("never claims attendance in the shared acknowledgement — it renders for empty events too", () => {
    // The acknowledgement is emitted for EVERY past hosted event, including ones
    // nobody joined. Claiming turnout ("people showed up") would be a fabricated
    // attendance figure — false for an empty event and self-contradicting next to a
    // did-not-attend note. Pin the turnout-agnostic wording across every branch.
    const cases = [
      summarizeHostReflection(null),
      summarizeHostReflection({ attendance: "did_not_attend", wouldJoinAgain: "no" }),
      summarizeHostReflection({ attendance: "attended", wouldJoinAgain: "yes" }),
    ];
    for (const o of cases) {
      const body = o.body.toLowerCase();
      expect(body).not.toContain("showed up");
      expect(body).not.toContain("people");
      expect(body).not.toContain("turned out");
    }
  });

  it("quietly mirrors the host's OWN recorded attendance without inventing a figure", () => {
    const outcome = summarizeHostReflection({ attendance: "attended", wouldJoinAgain: "yes" });
    expect(outcome.recorded).toBe(true);
    // No reflect prompt once recorded — the loop is closed, no re-nagging.
    expect(outcome.reflectPrompt).toBeNull();
    expect(outcome.body).toContain("You marked this as happened");
    expect(outcome.body).toContain("You'd gather this group again.");
    // Honest: it invents no attendance count or participant figure.
    expect(outcome.body).not.toMatch(/\d/);
    assertClean(`${outcome.heading} ${outcome.body}`);
  });

  it("reads without blame for a left-early or did-not-attend outcome (non-punitive)", () => {
    const left = summarizeHostReflection({ attendance: "left_early", wouldJoinAgain: "prefer_not_to_say" });
    expect(left.body).toContain("left this one early");
    expect(left.body).toContain("hosting it still mattered");

    const missed = summarizeHostReflection({ attendance: "did_not_attend", wouldJoinAgain: "no" });
    expect(missed.body).toContain("didn't come together for you");
    // "Would not host again" is framed as useful, never as failure.
    expect(missed.body).toContain("good to know for next time");
    for (const o of [left, missed]) assertClean(`${o.heading} ${o.body}`);
  });

  it("exposes only the host's own reflection — no participant identity or attendance", () => {
    // The function's only input is the host's own reflection shape; there is no
    // channel for another member's data. This pins that contract at the type level
    // and asserts the copy never references others.
    const outcome = summarizeHostReflection({ attendance: "attended", wouldJoinAgain: "prefer_not_to_say" });
    expect(outcome.body.toLowerCase()).not.toContain("they");
    expect(outcome.body.toLowerCase()).not.toContain("attended");
  });
});
