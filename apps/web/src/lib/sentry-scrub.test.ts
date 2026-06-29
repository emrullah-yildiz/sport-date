import { describe, expect, it } from "vitest";

import { scrubEvent } from "./sentry-scrub";

// These tests pin the PII-scrubbing contract for Sentry events. This is a
// privacy-first EU dating product: an event sent to Sentry must never carry a
// member email, IP, request body, cookie, or Authorization header.

describe("scrubEvent", () => {
  it("drops the user identity and server_name", () => {
    const scrubbed = scrubEvent({
      user: { id: "u1", email: "alice@example.com", ip_address: "203.0.113.7" },
      server_name: "web-fra1-01",
    });

    expect(scrubbed).not.toBeNull();
    expect(scrubbed).not.toHaveProperty("user");
    expect(scrubbed).not.toHaveProperty("server_name");
  });

  it("strips request body/data, query string, cookies, and env", () => {
    const scrubbed = scrubEvent({
      request: {
        data: { password: "hunter2", bio: "free text" },
        query_string: "token=abc123&email=alice@example.com",
        cookies: { session: "secret" },
        env: { REMOTE_ADDR: "203.0.113.7" },
      },
    });

    const request = (scrubbed as { request: Record<string, unknown> }).request;
    expect(request).not.toHaveProperty("data");
    expect(request).not.toHaveProperty("query_string");
    expect(request).not.toHaveProperty("cookies");
    expect(request).not.toHaveProperty("env");
  });

  it("keeps the URL path but removes the query string", () => {
    const scrubbed = scrubEvent({
      request: { url: "https://app.example.com/reset?token=abc&email=alice@example.com" },
    });

    const url = (scrubbed as { request: { url: string } }).request.url;
    expect(url).toBe("https://app.example.com/reset");
    expect(url).not.toContain("token");
    expect(url).not.toContain("@");
  });

  it("removes Cookie and Authorization headers (case-insensitive) and forwarded IPs", () => {
    const scrubbed = scrubEvent({
      request: {
        headers: {
          Cookie: "session=secret",
          Authorization: "Bearer token",
          "X-Forwarded-For": "203.0.113.7",
          "X-Real-IP": "203.0.113.7",
          "User-Agent": "Mozilla/5.0",
        },
      },
    });

    const headers = (scrubbed as { request: { headers: Record<string, unknown> } }).request.headers;
    expect(headers).not.toHaveProperty("Cookie");
    expect(headers).not.toHaveProperty("Authorization");
    expect(headers).not.toHaveProperty("X-Forwarded-For");
    expect(headers).not.toHaveProperty("X-Real-IP");
    // Non-sensitive headers survive.
    expect(headers["User-Agent"]).toBe("Mozilla/5.0");
  });

  it("redacts emails and IPv4/IPv6 from message, extra, and exception text", () => {
    const scrubbed = scrubEvent({
      message: "failed for alice@example.com from 203.0.113.7",
      extra: { detail: "user bob@test.co at 2001:db8::1 retried" },
      exception: {
        values: [{ value: "DB error: connect carol@mail.org / 198.51.100.42" }],
      },
    });

    const serialized = JSON.stringify(scrubbed);
    expect(serialized).not.toContain("alice@example.com");
    expect(serialized).not.toContain("bob@test.co");
    expect(serialized).not.toContain("carol@mail.org");
    expect(serialized).not.toContain("203.0.113.7");
    expect(serialized).not.toContain("198.51.100.42");
    expect(serialized).not.toContain("2001:db8::1");
    expect(serialized).toContain("[redacted]");
  });

  it("leaves an event with no PII structurally intact", () => {
    const scrubbed = scrubEvent({
      message: "a plain operational error",
      tags: { route: "/discover" },
    });

    expect(scrubbed).toEqual({
      message: "a plain operational error",
      tags: { route: "/discover" },
    });
  });

  it("returns the same object reference (in-place scrub)", () => {
    const event = { user: { id: "x" }, message: "hi" };
    const scrubbed = scrubEvent(event);
    expect(scrubbed).toBe(event);
  });
});
