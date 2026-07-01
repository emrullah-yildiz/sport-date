import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AccountMenu, { AccountMenuPanel } from "./AccountMenu";

// The open/closed state is toggled by a click that renderToStaticMarkup never runs,
// so the container is asserted in its initial (closed) state for the trigger's
// accessibility contract, and the menu contents are asserted directly through the
// presentational AccountMenuPanel (the exact JSX the container renders when open).

function renderTrigger(firstName?: string) {
  return renderToStaticMarkup(<AccountMenu firstName={firstName} />);
}

function renderPanel(submitting = false) {
  return renderToStaticMarkup(
    <AccountMenuPanel
      menuId="account-menu-test"
      submitting={submitting}
      onNavigate={() => {}}
      onSignOut={() => {}}
    />,
  );
}

describe("AccountMenu trigger", () => {
  it("is a real button with a menu-disclosure contract (haspopup, controls, collapsed)", () => {
    const html = renderTrigger("Bea");
    expect(html).toMatch(/<button[^>]*type="button"/);
    expect(html).toMatch(/aria-haspopup="menu"/);
    expect(html).toMatch(/aria-expanded="false"/);
    expect(html).toMatch(/aria-controls="/);
  });

  it("names the account with the member's first name for screen readers", () => {
    expect(renderTrigger("Bea")).toContain("Account: Bea");
  });

  it("still renders a labelled account trigger when no name is supplied", () => {
    const html = renderTrigger();
    expect(html).toMatch(/aria-haspopup="menu"/);
    expect(html).toContain(">Account<");
  });

  it("keeps the menu closed (no menu items) until opened", () => {
    const html = renderTrigger("Bea");
    expect(html).not.toContain('role="menu"');
    expect(html).not.toContain("Sign out");
  });
});

describe("AccountMenu panel", () => {
  it("exposes both a sign-out and a switch-account action plus a profile link", () => {
    const html = renderPanel();
    expect(html).toContain('role="menu"');
    expect(html).toContain("Your profile");
    expect(html).toContain("Switch account");
    expect(html).toContain("Sign out");
    // The profile link points at /profile so members can always reach their account.
    expect(html).toMatch(/href="\/profile"/);
  });

  it("marks every menu entry with role=menuitem and keyboard-reachable roles", () => {
    const html = renderPanel();
    const menuitems = html.match(/role="menuitem"/g) ?? [];
    expect(menuitems.length).toBe(3);
  });

  it("disables the logout actions and shows progress while signing out", () => {
    const html = renderPanel(true);
    expect(html).toContain("Signing out…");
    expect(html).toMatch(/<button[^>]*disabled/);
  });
});
