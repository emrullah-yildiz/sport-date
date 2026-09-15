/** Native, reversible depth. No wheel interception or per-frame React renders. */
export function observeHeroMotion(element: HTMLElement) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let disposed = false;
  const draw = () => {
    frame = 0;
    if (disposed) return;
    const rect = element.getBoundingClientRect();
    const progress = preference.matches || element.matches(":focus-within")
      ? 0 : Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
    element.style.setProperty("--hero-progress", progress.toFixed(4));
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  preference.addEventListener("change", schedule);
  element.addEventListener("focusin", schedule);
  element.addEventListener("focusout", schedule);
  draw();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    preference.removeEventListener("change", schedule);
    element.removeEventListener("focusin", schedule);
    element.removeEventListener("focusout", schedule);
    element.style.removeProperty("--hero-progress");
  };
}
