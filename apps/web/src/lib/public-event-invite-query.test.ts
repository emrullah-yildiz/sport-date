import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/lib/db";
import { getPublicEventInvite } from "./events";

// Reconstruct the raw SQL a tagged-template `sql` call was built from, so a test
// can assert on the WHERE clause without a live database (same harness as
// discoverable-event-view.test.ts).
function renderQuery(strings: TemplateStringsArray, values: unknown[]): string {
  return strings.reduce((acc, part, index) => acc + part + (index < values.length ? `«${String(values[index])}»` : ""), "");
}

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function inviteRow(over: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: EVENT_ID, sport: "Tennis", experience_levels: ["beginner", "intermediate"],
    language: "English", public_area_label: "Floreasca", public_city: "Bucharest",
    public_country_code: "RO", starts_at: "2026-07-10T16:00:00.000Z",
    time_zone: "Europe/Bucharest", duration_minutes: 90, capacity: 4, accepted_count: 1,
    ...over,
  };
}

describe("getPublicEventInvite — the unauthenticated share read (CX-20260704)", () => {
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

  it("only ever renders a published event by an active host", async () => {
    mockDb([inviteRow()]);
    await getPublicEventInvite(EVENT_ID);
    expect(lastQuery).toContain("events.status = 'published'");
    expect(lastQuery).toContain("host.account_status = 'active'");
  });

  it("returns null (→ safe 404, no data leak) for unknown / draft / cancelled events", async () => {
    mockDb([]);
    expect(await getPublicEventInvite(EVENT_ID)).toBeNull();
  });

  it("rejects a malformed event id without touching the database", async () => {
    const sql = vi.fn();
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    expect(await getPublicEventInvite("not-a-uuid")).toBeNull();
    expect(sql).not.toHaveBeenCalled();
  });

  it("never selects the precise venue, any coordinate, host free text, or any person", async () => {
    mockDb([inviteRow()]);
    await getPublicEventInvite(EVENT_ID);
    // No private-location join or columns.
    expect(lastQuery).not.toContain("event_private_locations");
    expect(lastQuery).not.toContain("venue_name");
    expect(lastQuery).not.toContain("address");
    expect(lastQuery).not.toContain("arrival_instructions");
    expect(lastQuery).not.toContain("precise_");
    // Not even the coarse approximate coordinate: the public page is text-only.
    expect(lastQuery).not.toContain("latitude");
    expect(lastQuery).not.toContain("longitude");
    // No host-authored free text (a venue can hide inside it) and no person.
    expect(lastQuery).not.toContain("events.title");
    expect(lastQuery).not.toContain("events.description");
    expect(lastQuery).not.toContain("first_name");
    expect(lastQuery).not.toContain("date_of_birth");
  });

  it("returns the allowlisted payload only, even from a polluted row", async () => {
    mockDb([inviteRow({
      venue_name: "Baza Sportiva Voinicelul",
      address: "Strada Maior Coravu 34",
      host_first_name: "Ana",
      title: "Evening rally",
      description: "Meet at gate B",
      precise_latitude: 44.4268,
    })]);
    const invite = await getPublicEventInvite(EVENT_ID);
    expect(invite).not.toBeNull();
    const serialized = JSON.stringify(invite);
    expect(serialized).not.toContain("Voinicelul");
    expect(serialized).not.toContain("Coravu");
    expect(serialized).not.toContain("Ana");
    expect(serialized).not.toContain("Evening rally");
    expect(serialized).not.toContain("gate B");
    expect(serialized).not.toContain("44.4268");
    expect(invite!.areaLabel).toBe("Floreasca");
    expect(invite!.city).toBe("Bucharest");
    expect(invite!.capacity - invite!.acceptedCount).toBe(3);
  });
});
