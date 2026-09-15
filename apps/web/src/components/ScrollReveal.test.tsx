import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScrollReveal from "./ScrollReveal";
import { observeScrollReveal } from "@/lib/scroll-reveal";

afterEach(() => vi.unstubAllGlobals());

function setup({ reduced = false, top = 900 } = {}) {
  const element = Object.assign(new EventTarget(), {
    dataset: {} as Record<string, string>,
    matches: vi.fn(() => false),
    getBoundingClientRect: () => ({ top }),
  });
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const disconnect = vi.fn();
  const observe = vi.fn();
  let intersect: (entries: { isIntersecting: boolean }[]) => void = () => {};
  class Observer {
    constructor(callback: typeof intersect) { intersect = callback; }
    disconnect = disconnect;
    observe = observe;
  }
  vi.stubGlobal("window", { innerHeight: 800, IntersectionObserver: Observer, matchMedia: () => motion });
  return { element, motion, disconnect, observe, enter: () => intersect([{ isIntersecting: true }]), leave: () => intersect([{ isIntersecting: false }]) };
}

describe("progressive scroll reveals", () => {
  it("server-renders readable semantic content with working links and no hidden state", () => {
    const html = renderToStaticMarkup(<ScrollReveal as="section" aria-label="Your next plan"><h2>Find your people</h2><a href="/discover">Explore</a></ScrollReveal>);
    expect(html).toContain('<section aria-label="Your next plan"');
    expect(html).toContain('<a href="/discover">Explore</a>');
    expect(html).not.toMatch(/hidden|inert|data-scroll-revealed|opacity/);
  });

  it("animates offscreen content only when it enters, then disconnects", () => {
    const s = setup();
    const cleanup = observeScrollReveal(s.element as unknown as HTMLElement);
    expect(s.observe).toHaveBeenCalledWith(s.element);
    expect(s.element.dataset.scrollRevealed).toBeUndefined();
    s.leave();
    expect(s.element.dataset.scrollRevealed).toBeUndefined();
    s.enter();
    expect(s.element.dataset.scrollRevealed).toBe("true");
    expect(s.disconnect).toHaveBeenCalledOnce();
    cleanup?.();
    expect(s.element.dataset.scrollRevealed).toBeUndefined();
  });

  it.each([{ reduced: true }, { top: 200 }])("leaves reduced-motion and first-paint content still: %j", options => {
    const s = setup(options);
    expect(observeScrollReveal(s.element as unknown as HTMLElement)).toBeUndefined();
    expect(s.observe).not.toHaveBeenCalled();
  });

  it("remains usable when the observer API is unavailable", () => {
    const s = setup();
    vi.stubGlobal("window", {});
    expect(observeScrollReveal(s.element as unknown as HTMLElement)).toBeUndefined();
    expect(s.element.dataset.scrollRevealed).toBeUndefined();
  });

  it.each(["focus", "motion"])("cancels animation immediately on %s and cleans up listeners", trigger => {
    const s = setup();
    const cleanup = observeScrollReveal(s.element as unknown as HTMLElement);
    s.enter();
    if (trigger === "focus") s.element.dispatchEvent(new Event("focusin"));
    else { s.motion.matches = true; s.motion.dispatchEvent(new Event("change")); }
    expect(s.element.dataset.scrollRevealed).toBeUndefined();
    s.enter();
    expect(s.element.dataset.scrollRevealed).toBeUndefined();
    cleanup?.();
    s.disconnect.mockClear();
    s.element.dispatchEvent(new Event("focusin"));
    s.motion.dispatchEvent(new Event("change"));
    expect(s.disconnect).not.toHaveBeenCalled();
  });
});
