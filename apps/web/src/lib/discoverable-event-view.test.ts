import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/lib/db";
import { computeJoinEligibility, getDiscoverableEvent, getDiscoverableEvents } from "./events";

// Reconstruct the raw SQL a tagged-template `sql` call was built from, so a test
// can assert on the WHERE clause without a live database. The neon/postgres client
// is a tagged template `sql`fragment`;`, so `strings` is the static text and the
// interpolations are the bound parameter values.
function renderQuery(strings: TemplateStringsArray, values: unknown[]): string {
  return strings.reduce((acc, part, index) => acc + part + (index < values.length ? `«${String(values[index])}»` : ""), "");
}

const HOST_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

// The public (approximate-only) row the single-event view query returns. It has NO
// venue_name / address / precise columns — the query never joins the private
// location table, so the precise venue cannot leak into this payload.
function publicRow(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: EVENT_ID, sport: "Tennis", title: "Evening rally", description: "A relaxed rally.",
    starts_at: "2026-07-10T16:00:00.000Z", time_zone: "Europe/Bucharest", duration_minutes: 90,
    capacity: 4, language: "English", minimum_age: 24, maximum_age: 38,
    experience_levels: ["beginner", "intermediate"], host_user_id: HOST_ID, host_first_name: "Ana",
    public_area_label: "Floreasca", public_city: "Bucharest", public_country_code: "RO",
    accepted_count: 1, request_id: null, request_status: null, request_skip_count: null, ...over,
  };
}

describe("getDiscoverableEvent — direct single-event public invitation view (CX-20260701)", () => {
  let lastQuery = "";
  beforeEach(() => {
    lastQuery = "";
  });

  function mockDb(rows: Array<Record<string, unknown>>) {
    const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      lastQuery = renderQuery(strings, values);
      return Promise.resolve(rows);
    });
    vi.mocked(getDatabase).mockReturnValue(sql as never);
  }

  it("returns the host their OWN published event (no 404) and flags viewerIsHost", async () => {
    // The reported bug: the host clicking "View the public invitation" got null → 404
    // because the feed query excluded their own event. The direct view must return it.
    mockDb([publicRow({ host_user_id: HOST_ID })]);
    const view = await getDiscoverableEvent({ id: HOST_ID, age: 30 }, EVENT_ID);
    expect(view).not.toBeNull();
    expect(view!.id).toBe(EVENT_ID);
    expect(view!.viewerIsHost).toBe(true);
    // The direct view must NOT carry the feed's host-exclusion clause.
    expect(lastQuery).not.toContain("host_user_id <> ");
  });

  it("returns the event to a permitted non-host viewer and flags viewerIsHost false", async () => {
    // A recipient opening a shared link is not the host; the compatibility filters
    // that gate the feed must not turn the direct link into a 404, so the query has
    // no age / skill / language / capacity gating.
    mockDb([publicRow({ host_user_id: HOST_ID })]);
    const view = await getDiscoverableEvent({ id: OTHER_ID, age: 55 }, EVENT_ID);
    expect(view).not.toBeNull();
    expect(view!.viewerIsHost).toBe(false);
    // No age/skill/language/capacity GATING in the WHERE — the direct link is not
    // the feed. (Note: candidate.languages is SELECTed for the eligibility hint
    // below, but there is no language WHERE filter.)
    expect(lastQuery).not.toContain("BETWEEN events.minimum_age");
    expect(lastQuery).not.toContain("compatible_sport");
    expect(lastQuery).not.toContain("UNNEST(candidate.languages)");
  });

  it("computes an eligibility reason for the direct view so the CTA never silently no-ops (item 1)", async () => {
    const future = "2099-07-10T16:00:00.000Z"; // clearly upcoming, so never "past"
    // Age-excluded viewer (event welcomes 24–38; viewer is 55) → "age".
    mockDb([publicRow({ starts_at: future, member_languages: ["English"] })]);
    const excluded = await getDiscoverableEvent({ id: OTHER_ID, age: 55 }, EVENT_ID);
    expect(excluded!.eligibility).toBe("age");
    // The direct view SELECTs the member's languages to power the hint.
    expect(lastQuery).toContain("candidate.languages AS member_languages");

    // In-range, language-overlapping, room left → eligible.
    mockDb([publicRow({ starts_at: future, member_languages: ["English"], accepted_count: 1, capacity: 4 })]);
    const ok = await getDiscoverableEvent({ id: OTHER_ID, age: 30 }, EVENT_ID);
    expect(ok!.eligibility).toBe("eligible");

    // The host viewing their own event is never gated by eligibility.
    mockDb([publicRow({ starts_at: future, host_user_id: HOST_ID, member_languages: [] })]);
    const host = await getDiscoverableEvent({ id: HOST_ID, age: 55 }, EVENT_ID);
    expect(host!.eligibility).toBe("eligible");
  });

  it("only ever renders a published event (draft/cancelled/completed are gated out)", async () => {
    mockDb([publicRow()]);
    await getDiscoverableEvent({ id: OTHER_ID, age: 30 }, EVENT_ID);
    expect(lastQuery).toContain("events.status = 'published'");
  });

  it("still applies the mutual-block guard so blocked parties stay hidden", async () => {
    mockDb([publicRow()]);
    await getDiscoverableEvent({ id: OTHER_ID, age: 30 }, EVENT_ID);
    expect(lastQuery).toContain("user_blocks");
    // A block in EITHER direction hides the event (mutual): viewer→host and host→viewer.
    expect(lastQuery).toContain(`blocker_user_id = «${OTHER_ID}» AND blocked_user_id = events.host_user_id`);
    expect(lastQuery).toContain(`blocker_user_id = events.host_user_id AND blocked_user_id = «${OTHER_ID}»`);
  });

  it("returns null (→ the page 404s) when no permitted row matches — e.g. a block or unpublished event", async () => {
    mockDb([]);
    const view = await getDiscoverableEvent({ id: OTHER_ID, age: 30 }, EVENT_ID);
    expect(view).toBeNull();
  });

  it("never selects the precise venue: the payload and query carry approximate location only", async () => {
    mockDb([publicRow()]);
    const view = await getDiscoverableEvent({ id: OTHER_ID, age: 30 }, EVENT_ID);
    // Payload exposes only the approximate area/city/country.
    expect(view!.areaLabel).toBe("Floreasca");
    expect(view!.city).toBe("Bucharest");
    expect(view).not.toHaveProperty("venueName");
    expect(view).not.toHaveProperty("address");
    // The query never joins the private-location table or selects a venue/address.
    expect(lastQuery).not.toContain("event_private_locations");
    expect(lastQuery).not.toContain("venue_name");
    expect(lastQuery).not.toContain("precise_");
  });

  it("rejects a malformed event id without touching the database", async () => {
    const sql = vi.fn();
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    expect(await getDiscoverableEvent({ id: OTHER_ID, age: 30 }, "not-a-uuid")).toBeNull();
    expect(sql).not.toHaveBeenCalled();
  });
});

describe("computeJoinEligibility — mirrors the join-gate reasons (item 1)", () => {
  const NOW = new Date("2026-07-04T12:00:00.000Z");
  const base = {
    startsAt: "2026-07-10T12:00:00.000Z", minimumAge: 24, maximumAge: 38, viewerAge: 30,
    memberLanguages: ["English"], eventLanguage: "English", acceptedCount: 1, capacity: 4, hasLiveRequest: false,
  };
  it("returns 'eligible' when age, language, timing and capacity all allow a request", () => {
    expect(computeJoinEligibility(base, NOW)).toBe("eligible");
  });
  it("returns 'past' for an event that already started", () => {
    expect(computeJoinEligibility({ ...base, startsAt: "2026-07-01T12:00:00.000Z" }, NOW)).toBe("past");
  });
  it("returns 'age' when the viewer is outside the welcomed range (either end)", () => {
    expect(computeJoinEligibility({ ...base, viewerAge: 18 }, NOW)).toBe("age");
    expect(computeJoinEligibility({ ...base, viewerAge: 55 }, NOW)).toBe("age");
  });
  it("returns 'language' when the member lists languages and none overlap", () => {
    expect(computeJoinEligibility({ ...base, memberLanguages: ["Romanian"], eventLanguage: "English" }, NOW)).toBe("language");
    // A member with NO listed language has no preference → not gated on language.
    expect(computeJoinEligibility({ ...base, memberLanguages: [] }, NOW)).toBe("eligible");
  });
  it("returns 'full' only when at capacity AND the viewer holds no live request", () => {
    expect(computeJoinEligibility({ ...base, acceptedCount: 4, capacity: 4 }, NOW)).toBe("full");
    // A member who already holds a place/pending request is not shut out by capacity.
    expect(computeJoinEligibility({ ...base, acceptedCount: 4, capacity: 4, hasLiveRequest: true }, NOW)).toBe("eligible");
  });
});

describe("getDiscoverableEvents — the FEED keeps every gate EXCEPT the profile-sport requirement (CX-20260704)", () => {
  let lastQuery = "";
  function mockDb(rows: Array<Record<string, unknown>>) {
    const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      lastQuery = renderQuery(strings, values);
      return Promise.resolve(rows);
    });
    vi.mocked(getDatabase).mockReturnValue(sql as never);
  }

  it("still excludes the viewer's OWN events from the feed", async () => {
    mockDb([]);
    await getDiscoverableEvents({ id: HOST_ID, age: 30 }, { city: "", sport: "", language: "", withinDays: 7 });
    // Feed host-exclusion is present and bound to the viewer.
    expect(lastQuery).toContain("events.host_user_id <> «11111111-1111-4111-8111-111111111111»");
  });

  it("NO LONGER requires the event's sport/skill to be in the viewer's profile (the P0 fix)", async () => {
    mockDb([]);
    await getDiscoverableEvents({ id: HOST_ID, age: 30 }, { city: "", sport: "", language: "", withinDays: 7 });
    // The mandatory JOIN that hid events for un-listed sports is gone: a member
    // WITHOUT the sport (the prod repro: account 35, no Tennis) now sees it. The
    // `compatible_sport` alias only ever existed on that removed JOIN.
    expect(lastQuery).not.toContain("compatible_sport");
    expect(lastQuery).not.toContain("JOIN user_sports");
  });

  it("still applies every OTHER feed gate (age, language, capacity) unchanged", async () => {
    mockDb([]);
    await getDiscoverableEvents({ id: HOST_ID, age: 30 }, { city: "", sport: "", language: "", withinDays: 7 });
    expect(lastQuery).toContain("BETWEEN events.minimum_age AND events.maximum_age");
    expect(lastQuery).toContain("candidate.languages");
    expect(lastQuery).toContain("< events.capacity");
    expect(lastQuery).toContain("events.status = 'published'");
    expect(lastQuery).toContain("user_blocks");
  });

  it("never selects the precise pin either — the feed stays pin-free even after map fine-tuning (CX-20260706)", async () => {
    mockDb([]);
    await getDiscoverableEvents({ id: HOST_ID, age: 30 }, { city: "", sport: "", language: "", withinDays: 7 });
    // The map picker writes tap-precision coordinates to the PRIVATE location
    // record; the discovery feed query must never join or select any of it.
    expect(lastQuery).not.toContain("event_private_locations");
    expect(lastQuery).not.toContain("precise_");
    expect(lastQuery).not.toContain("venue_name");
  });

  it("keeps a FULL event visible only to a member with a LIVE request, not a cancelled/declined one (item 4)", async () => {
    mockDb([]);
    await getDiscoverableEvents({ id: HOST_ID, age: 30 }, { city: "", sport: "", language: "", withinDays: 7 });
    // The capacity exemption is scoped to pending/accepted, so a stale (cancelled/
    // declined) request no longer keeps a full event dangling a doomed re-request.
    expect(lastQuery).toContain("member_request.status IN ('pending', 'accepted')");
    expect(lastQuery).not.toContain("member_request.id IS NOT NULL");
  });

  it("still narrows to ONE sport when the explicit sport filter is chosen", async () => {
    mockDb([]);
    await getDiscoverableEvents({ id: HOST_ID, age: 30 }, { city: "", sport: "Tennis", language: "", withinDays: 7 });
    // The explicit filter is applied verbatim (case-insensitive) …
    expect(lastQuery).toContain("LOWER(events.sport) = LOWER(«Tennis»)");
    // … and still without the profile-sport JOIN.
    expect(lastQuery).not.toContain("compatible_sport");
    expect(lastQuery).not.toContain("JOIN user_sports");
  });
});
