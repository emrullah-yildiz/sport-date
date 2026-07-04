import { describe, expect, it, vi } from "vitest";

import { buildJoinRequestDecisionEmail, dispatchJoinRequestDecisionEmail } from "./join-request-notification";

const baseInput = {
  origin: "https://keepitup.social",
  eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  to: "member@example.test",
  firstName: "Mara",
  sport: "Tennis",
  areaLabel: "Floreasca",
  city: "Bucharest",
  whenLabel: "Sat, 11 Jul, 10:00",
} as const;

describe("join-request decision email", () => {
  it("tells an accepted member where to find private logistics without including a precise address", () => {
    const draft = buildJoinRequestDecisionEmail({ ...baseInput, decision: "accepted" });

    expect(draft.subject).toContain("You're in");
    expect(draft.actionUrl).toBe("https://keepitup.social/events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/room");
    expect(draft.text).toContain("private meeting point");
    expect(draft.text).toContain("Approximate area: Floreasca, Bucharest");
    expect(draft.text).not.toContain("Street");
  });

  it("closes a declined request with dignified copy and no skip count or reason", () => {
    const draft = buildJoinRequestDecisionEmail({ ...baseInput, decision: "declined" });

    expect(draft.subject).toBe("Update on your Tennis request");
    expect(draft.text).toContain("you do not have a place");
    expect(draft.text).toContain("reasons and request history private");
    expect(draft.text).not.toMatch(/skip|third|three/i);
  });

  it("fails closed when delivery is disabled", async () => {
    const draft = buildJoinRequestDecisionEmail({ ...baseInput, decision: "accepted" });
    const send = vi.fn();

    const result = await dispatchJoinRequestDecisionEmail(draft, { env: {}, send, log: vi.fn() });

    expect(result).toEqual({ state: "disabled", provider: "disabled" });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends through Gmail only when the shared provider gate is fully configured", async () => {
    const draft = buildJoinRequestDecisionEmail({ ...baseInput, decision: "declined" });
    const send = vi.fn().mockResolvedValue(undefined);
    const env = {
      EMAIL_DELIVERY_ENABLED: "true",
      EMAIL_DELIVERY_PROVIDER: "gmail",
      GMAIL_CLIENT_ID: "client",
      GMAIL_CLIENT_SECRET: "secret",
      GMAIL_REFRESH_TOKEN: "refresh",
      GMAIL_SENDER_EMAIL: "support@keepitup.social",
    };

    await expect(dispatchJoinRequestDecisionEmail(draft, { env, send })).resolves.toEqual({ state: "sent", provider: "gmail" });
    expect(send).toHaveBeenCalledOnce();
  });
});
