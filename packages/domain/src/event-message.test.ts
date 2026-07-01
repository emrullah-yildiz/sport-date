import { describe, expect, it } from "vitest";

import {
  EVENT_MESSAGE_MAX_LENGTH,
  canAccessEventChat,
  validateEventMessage,
  type EventRoomChatRelationship,
} from "./event-message";

describe("event message validation", () => {
  it("accepts a short message and returns it trimmed", () => {
    const result = validateEventMessage({ body: "  Running 5 min late  " });
    expect(result).toEqual({ valid: true, body: "Running 5 min late" });
  });

  it("accepts a bare string body too", () => {
    expect(validateEventMessage("Bring a spare racket")).toEqual({ valid: true, body: "Bring a spare racket" });
  });

  it("rejects an empty or whitespace-only message", () => {
    expect(validateEventMessage({ body: "" }).valid).toBe(false);
    expect(validateEventMessage({ body: "     " }).valid).toBe(false);
    expect(validateEventMessage({ body: "\n\t" }).valid).toBe(false);
    expect(validateEventMessage({}).valid).toBe(false);
    expect(validateEventMessage(null).valid).toBe(false);
  });

  it("rejects a non-string body", () => {
    expect(validateEventMessage({ body: 42 }).valid).toBe(false);
    expect(validateEventMessage({ body: { text: "hi" } }).valid).toBe(false);
  });

  it("enforces the length cap (accepts at the cap, rejects one over)", () => {
    const atCap = "a".repeat(EVENT_MESSAGE_MAX_LENGTH);
    const overCap = "a".repeat(EVENT_MESSAGE_MAX_LENGTH + 1);
    expect(validateEventMessage({ body: atCap })).toEqual({ valid: true, body: atCap });
    expect(validateEventMessage({ body: overCap }).valid).toBe(false);
  });

  it("measures length after trimming so trailing whitespace does not inflate it", () => {
    const body = "a".repeat(EVENT_MESSAGE_MAX_LENGTH) + "   ";
    expect(validateEventMessage({ body })).toEqual({ valid: true, body: "a".repeat(EVENT_MESSAGE_MAX_LENGTH) });
  });
});

describe("event chat authorization rule", () => {
  it("permits only the host and accepted participants", () => {
    expect(canAccessEventChat("host")).toBe(true);
    expect(canAccessEventChat("accepted")).toBe(true);
  });

  it("denies pending, declined, and non-participants", () => {
    const denied: EventRoomChatRelationship[] = ["pending", "declined", "none"];
    for (const relationship of denied) {
      expect(canAccessEventChat(relationship)).toBe(false);
    }
  });

  it("admits exactly two relationships and nothing else", () => {
    const all: EventRoomChatRelationship[] = ["host", "accepted", "pending", "declined", "none"];
    expect(all.filter(canAccessEventChat)).toEqual(["host", "accepted"]);
  });
});
