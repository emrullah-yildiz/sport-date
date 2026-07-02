import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ProfileEmptyAction from "./ProfileEmptyAction";

/**
 * Tripwire for CX-20260703-profile-empty-cta-opens-collapsed-editor.
 *
 * The /profile empty-state CTAs targeted `#edit-profile` — a COLLAPSED
 * `<details>` — so activating one only scrolled to the closed disclosure; the
 * named field (intro/languages/sports/prompts) stayed hidden and unfocused.
 * ProfileEmptyAction now opens the editor and moves focus to the field on
 * activation. DOM focus/`<details>.open` can't be exercised in the node test
 * env, so we assert the rendered fallback contract and, like the sibling
 * reduced-motion tripwires, assert on the source that the behaviour is wired.
 */

describe("ProfileEmptyAction rendered contract", () => {
  it("renders a real, keyboard-operable anchor to the target field with the CTA styling", () => {
    const html = renderToStaticMarkup(
      <ProfileEmptyAction target="edit-profile-bio">Write a short intro</ProfileEmptyAction>,
    );
    // A real anchor: Enter activates it, and the fragment is a no-JS fallback
    // (modern browsers auto-expand a <details> when navigating inside it).
    expect(html).toMatch(/^<a /);
    expect(html).toContain('href="#edit-profile-bio"');
    // Preserves the 44px / visible-focus CTA styling class.
    expect(html).toContain('class="profile-empty-action"');
    expect(html).toContain("Write a short intro");
  });
});

describe("ProfileEmptyAction opens the editor and focuses the named field", () => {
  const source = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "ProfileEmptyAction.tsx"),
    "utf8",
  );

  it("opens the collapsed <details id=edit-profile> on activation", () => {
    expect(source).toContain('getElementById("edit-profile")');
    expect(source).toContain("editor.open = true");
  });

  it("moves keyboard focus to the CTA's target field", () => {
    expect(source).toContain("getElementById(target)");
    expect(source).toContain("field.focus(");
  });

  it("honours prefers-reduced-motion for the scroll (instant, no animation)", () => {
    expect(source).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(source).toMatch(/prefersReducedMotion \? "auto" : "smooth"/);
  });
});
