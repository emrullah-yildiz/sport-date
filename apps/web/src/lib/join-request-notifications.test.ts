import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let capturedQuery = "";
const fakeSql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
  capturedQuery = strings.reduce((text, part, index) => text + part + (index < values.length ? `$${index}` : ""), "");
  return Promise.resolve([{
    email: "member@example.test",
    first_name: "Mara",
    sport: "Tennis",
    public_area_label: "Floreasca",
    public_city: "Bucharest",
    starts_at: "2026-07-11T07:00:00.000Z",
    time_zone: "Europe/Bucharest",
  }]);
});

vi.mock("@/lib/db", () => ({ getDatabase: () => fakeSql }));
vi.mock("@/lib/auth-email-content", () => ({ resolveAuthEmailOrigin: () => "https://keepitup.social" }));
vi.mock("@/lib/gmail-email-delivery", () => ({ sendGmailEmail: vi.fn() }));
vi.mock("@/lib/join-request-notification", () => ({
  buildJoinRequestDecisionEmail: vi.fn((input) => ({ ...input, subject: "Decision", text: "Decision", html: "Decision", actionUrl: "https://keepitup.social/event" })),
  dispatchJoinRequestDecisionEmail: vi.fn().mockResolvedValue({ state: "disabled", provider: "disabled" }),
}));

import { buildJoinRequestDecisionEmail, dispatchJoinRequestDecisionEmail } from "./join-request-notification";
import { notifyRequesterOfJoinDecision } from "./join-request-notifications";

describe("join-request decision notification boundary", () => {
  beforeEach(() => {
    capturedQuery = "";
    vi.clearAllMocks();
  });

  it("loads only public event location fields and dispatches the committed decision", async () => {
    await notifyRequesterOfJoinDecision(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "accepted",
    );

    expect(capturedQuery).toContain("event.public_area_label");
    expect(capturedQuery).toContain("event.public_city");
    expect(capturedQuery).not.toMatch(/event_private_locations|precise|latitude|longitude|postal_code|address/i);
    expect(buildJoinRequestDecisionEmail).toHaveBeenCalledWith(expect.objectContaining({
      decision: "accepted",
      areaLabel: "Floreasca",
      city: "Bucharest",
    }));
    expect(dispatchJoinRequestDecisionEmail).toHaveBeenCalledOnce();
  });
});
