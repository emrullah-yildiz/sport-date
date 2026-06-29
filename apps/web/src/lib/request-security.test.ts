import { describe, expect, it } from "vitest";

import { isTrustedBrowserMutation } from "./request-security";

describe("browser mutation origin checks", () => {
  it("allows same-origin browser requests", () => {
    const request = new Request("https://sportdate.example/api/events", {
      headers: { origin: "https://sportdate.example", "sec-fetch-site": "same-origin" },
    });
    expect(isTrustedBrowserMutation(request)).toBe(true);
  });

  it("rejects cross-site fetch metadata and mismatched origins", () => {
    expect(isTrustedBrowserMutation(new Request("https://sportdate.example/api/events", {
      headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
    }))).toBe(false);
    expect(isTrustedBrowserMutation(new Request("https://sportdate.example/api/events", {
      headers: { origin: "https://attacker.example" },
    }))).toBe(false);
  });

  it("allows non-browser clients without browser origin headers", () => {
    expect(isTrustedBrowserMutation(new Request("https://sportdate.example/api/events"))).toBe(true);
  });
});

