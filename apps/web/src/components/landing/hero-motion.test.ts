import { afterEach, expect, it, vi } from "vitest";
import { observeHeroMotion } from "./hero-motion";

afterEach(() => vi.unstubAllGlobals());

it("scrubs reversibly, batches frames, stops for focus/reduced motion and cleans up", () => {
  let top = 0;
  let focused = false;
  let callback: FrameRequestCallback = () => {};
  const values = new Map<string, string>();
  const preference = Object.assign(new EventTarget(), { matches: false });
  const surface = Object.assign(new EventTarget(), {
    style: { setProperty: (key: string, value: string) => values.set(key, value), removeProperty: (key: string) => values.delete(key) },
    matches: () => focused,
    getBoundingClientRect: () => ({ top, height: 800 }),
  });
  const browser = Object.assign(new EventTarget(), { matchMedia: () => preference });
  const request = vi.fn((fn: FrameRequestCallback) => { callback = fn; return 1; });
  vi.stubGlobal("window", browser);
  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const stop = observeHeroMotion(surface as unknown as HTMLElement);
  expect(values.get("--hero-progress")).toBe("0.0000");
  top = -400;
  browser.dispatchEvent(new Event("scroll"));
  browser.dispatchEvent(new Event("scroll"));
  expect(request).toHaveBeenCalledTimes(1);
  callback(0);
  expect(values.get("--hero-progress")).toBe("0.5000");
  top = -200;
  browser.dispatchEvent(new Event("scroll")); callback(0);
  expect(values.get("--hero-progress")).toBe("0.2500");
  focused = true;
  surface.dispatchEvent(new Event("focusin")); callback(0);
  expect(values.get("--hero-progress")).toBe("0.0000");
  focused = false; preference.matches = true;
  preference.dispatchEvent(new Event("change")); callback(0);
  expect(values.get("--hero-progress")).toBe("0.0000");
  stop(); request.mockClear();
  browser.dispatchEvent(new Event("scroll"));
  expect(request).not.toHaveBeenCalled();
  expect(values.size).toBe(0);
});
