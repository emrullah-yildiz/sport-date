/** Animate once on entry without hiding offscreen content or intercepting scrolling. */
export function observeScrollReveal(element: HTMLElement): (() => void) | undefined {
  if (typeof window.IntersectionObserver !== "function" || typeof window.matchMedia !== "function") return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Preserve the first paint and avoid moving the content somebody is already reading.
  if (motion.matches || element.getBoundingClientRect().top < window.innerHeight) return;

  let active = true;
  const observer = new window.IntersectionObserver((entries) => {
    if (!active || !entries.some(entry => entry.isIntersecting)) return;
    active = false;
    if (!motion.matches && !element.matches(":focus-within")) element.dataset.scrollRevealed = "true";
    observer.disconnect();
  }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });

  const stop = () => {
    active = false;
    delete element.dataset.scrollRevealed;
    observer.disconnect();
  };
  // Keyboard focus must always be immediate, including when focus scrolls the page.
  element.addEventListener("focusin", stop);
  motion.addEventListener("change", stop);
  observer.observe(element);
  return () => {
    stop();
    element.removeEventListener("focusin", stop);
    motion.removeEventListener("change", stop);
  };
}
