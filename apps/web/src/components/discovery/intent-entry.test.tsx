import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DiscoveryIntentEntry from "./intent-entry";
import { discoveryIntentHref } from "./intent-links";

describe("discovery time intent", () => {
  it("changes only rolling days while preserving effective search choices", () => {
    const url = new URL(discoveryIntentHref({ days: "30", city: "Cluj-Napoca", sport: "Tennis", near: "all", radius: "25", language: "English", schedule: "evening", languages: ["Romanian", "French"] }, 1), "https://example.invalid");
    expect(url.pathname).toBe("/discover");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ days: "1", city: "Cluj-Napoca", sport: "Tennis", near: "all", radius: "25", language: "English", schedule: "evening" });
    expect(url.searchParams.getAll("languages")).toEqual(["Romanian", "French"]);
    expect(url.searchParams.getAll("days")).toEqual(["1"]);
  });
  it("does not copy arbitrary private query fields or precise coordinates", () => {
    const href = discoveryIntentHref({ lat: "44.456789", lng: "26.123456", email: "private@example.invalid", token: "private-token", address: "private-address" }, 7);
    expect(href).not.toMatch(/private|44\.456789|26\.123456/);
    const query = new URL(href, "https://example.invalid").searchParams;
    expect(Number(query.get("lat"))).toBeCloseTo(44.5);
    expect(Number(query.get("lng"))).toBeCloseTo(26.1);
  });
  it("drops invalid coordinates and bounds malformed or repeated scalar filters", () => {
    const href = discoveryIntentHref({ lat: "200", lng: "26", city: ["A", "B"], sport: "a".repeat(100), languages: "English, English, Romanian" }, 30);
    const query = new URL(href, "https://example.invalid").searchParams;
    expect(query.has("lat")).toBe(false);
    expect(query.has("lng")).toBe(false);
    expect(query.has("city")).toBe(false);
    expect(query.get("sport")).toHaveLength(60);
    expect(query.getAll("languages")).toEqual(["English", "Romanian"]);
  });
  it("labels rolling intervals honestly and only marks the effective server-selected choice", () => {
    const html = renderToStaticMarkup(<DiscoveryIntentEntry query={{ days: "invalid" }} withinDays={7} />);
    expect(html).toContain("Next 24 hours");
    expect(html).toContain("Next 7 days");
    expect(html).toContain("Next 30 days");
    expect(html).not.toMatch(/This week|This weekend|Today/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*href="\/discover\?days=7"/);
  });
  it("offers changing time without inventing available plans or people", () => {
    const html = renderToStaticMarkup(<DiscoveryIntentEntry query={{ sport: "Tennis" }} withinDays={1} />);
    expect(html).toContain("sport=Tennis&amp;days=30");
    expect(html).not.toMatch(/people near|join now|request a place|plans match|crew found/i);
  });
});


describe("free date entry", () => {
  it("shows the selected day, retains filters in its GET form, and clears date on shortcuts", () => {
    const query = { date: "2026-10-25", sport: "Tennis", languages: ["English", "French"], lat: "44.456789", lng: "26.123456", token: "SECRET" };
    const html = renderToStaticMarkup(<DiscoveryIntentEntry query={query} withinDays={7} onDate="2026-10-25" />);
    expect(html).toContain('action="/discover"');
    expect(html).toContain('method="get"');
    expect(html).toContain('type="date"');
    expect(html).toContain('value="2026-10-25"');
    expect(html).toContain('name="sport" value="Tennis"');
    expect(html).toContain('name="languages" value="French"');
    expect(html).toContain('name="lat" value="44.5"');
    expect(html).toContain("25 October 2026");
    expect(html).toContain("Clear date");
    expect(html).not.toContain('aria-current="page"');
    expect(html).not.toMatch(/SECRET|44\.456789|26\.123456/);
    expect(discoveryIntentHref(query, 1)).not.toContain("date=");
  });
});
