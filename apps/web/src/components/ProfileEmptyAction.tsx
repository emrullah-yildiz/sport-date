"use client";

/**
 * The empty-state CTAs on /profile — "Write a short intro", "Add a language",
 * "Add a sport", "Answer a prompt" — must land the member in an OPEN editor with
 * keyboard focus on the field they named. The editor is a collapsed
 * `<details id="edit-profile">` (EditProfileForm), whose id sits on the
 * `<details>` itself, so a bare in-page anchor only scrolls to a CLOSED
 * disclosure and the promised field stays hidden (CX-20260703). A prior warmth
 * ticket added the anchor + copy but only verified the links render.
 *
 * This upgrades each CTA to, on activation, open the `<details>` and move focus
 * to the target field. It is a real anchor (Enter activates it; keyboard- and
 * pointer-operable), keeps the `#<field>` fragment as a no-JS fallback (modern
 * browsers auto-expand a `<details>` when navigating to a fragment inside it),
 * works whether the editor is already open or closed, and honours
 * prefers-reduced-motion so the scroll never animates for members who opt out.
 */
export default function ProfileEmptyAction({
  target,
  children,
}: {
  target: string;
  children: React.ReactNode;
}) {
  function activate(event: React.MouseEvent<HTMLAnchorElement>) {
    const field = document.getElementById(target);
    // Progressive enhancement only: if the field isn't in the DOM, let the
    // browser follow the fragment href as before.
    if (!field) return;
    event.preventDefault();
    // Open the profile editor so the named field is actually revealed — the id
    // lives on the <details>, which otherwise stays collapsed on navigation.
    const editor = document.getElementById("edit-profile");
    if (editor instanceof HTMLDetailsElement) editor.open = true;
    // Move keyboard / assistive-tech focus onto the field the CTA named, then
    // bring it into view. preventScroll stops focus double-scrolling; the
    // explicit scroll is instant under reduced-motion so no animation nauseates.
    field.focus({ preventScroll: true });
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    field.scrollIntoView({ block: "center", behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  return (
    <a href={`#${target}`} className="profile-empty-action" onClick={activate}>
      {children}
    </a>
  );
}
