import { describe, expect, it } from "vitest";

import { deriveDeviceLabel } from "./device-label";

describe("deriveDeviceLabel", () => {
  it("labels Chrome on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(deriveDeviceLabel(ua)).toBe("Chrome on Windows");
  });

  it("labels Safari on iPhone (not Chrome, despite the Safari token)", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1";
    expect(deriveDeviceLabel(ua)).toBe("Safari on iPhone");
  });

  it("labels Safari on Mac", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    expect(deriveDeviceLabel(ua)).toBe("Safari on Mac");
  });

  it("labels Firefox on Windows", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
    expect(deriveDeviceLabel(ua)).toBe("Firefox on Windows");
  });

  it("labels Chrome on Android", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(deriveDeviceLabel(ua)).toBe("Chrome on Android");
  });

  it("labels Edge (not Chrome) on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(deriveDeviceLabel(ua)).toBe("Edge on Windows");
  });

  it("labels Chrome on iPhone from a CriOS user-agent", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1";
    expect(deriveDeviceLabel(ua)).toBe("Chrome on iPhone");
  });

  it("falls back to OS-only when the browser is unknown", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SomeUnknownAgent/1.0";
    expect(deriveDeviceLabel(ua)).toBe("Browser on Windows");
  });

  it("returns null for a missing, empty, or unrecognisable user-agent", () => {
    expect(deriveDeviceLabel(null)).toBeNull();
    expect(deriveDeviceLabel(undefined)).toBeNull();
    expect(deriveDeviceLabel("")).toBeNull();
    expect(deriveDeviceLabel("   ")).toBeNull();
    expect(deriveDeviceLabel("curl/8.4.0")).toBeNull();
  });

  it("stays coarse: no version numbers, hardware model, or the raw UA leak into the label", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36";
    const label = deriveDeviceLabel(ua);
    expect(label).toBe("Chrome on Android");
    // No version, build, or device model tokens survive into the stored label.
    expect(label).not.toMatch(/\d/);
    expect(label).not.toContain("SM-S911B");
    expect(label).not.toContain("Build");
    expect(label).not.toContain("AppleWebKit");
  });

  it("bounds the label length to 60 characters", () => {
    const label = deriveDeviceLabel(
      "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Safari/537.36",
    );
    expect((label ?? "").length).toBeLessThanOrEqual(60);
  });
});
