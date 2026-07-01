import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import LandingPage from "./page";

async function render() {
  // The page is an async server component; await its element tree, then render
  // it to static markup so we can assert on the auth-aware CTAs.
  const element = await LandingPage();
  return renderToStaticMarkup(element);
}

const member = {
  id: "42",
  firstName: "Ana",
  lastName: "Pop",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LandingPage auth-awareness", () => {
  it("shows the logged-out marketing CTAs when there is no session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const html = await render();

    // Marketing sign-in / sign-up path is intact for visitors.
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/signup"');
    expect(html).toContain("Sign in");
    // No signed-in affordances leak to logged-out visitors.
    expect(html).not.toContain("Enter Rally");
    expect(html).not.toContain("Signed in as");
  });

  it("offers a signed-in path into the app when a session exists", async () => {
    mocks.getCurrentUser.mockResolvedValue(member);

    const html = await render();

    // A signed-in member must reach the app in one click and see they're signed in.
    expect(html).toContain("Enter Rally");
    expect(html).toContain('href="/discover"');
    expect(html).toContain("Signed in as Ana");
    // They are never shown the "Sign in" CTA that implies they were logged out.
    expect(html).not.toContain('href="/login"');
  });

  it("points the home logo at the app for signed-in members and at marketing for visitors", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const loggedOut = await render();
    expect(loggedOut).toContain('href="/landing"');

    mocks.getCurrentUser.mockResolvedValueOnce(member);
    const loggedIn = await render();
    // The brand logo must not send a returning member back to a logged-out-looking page.
    expect(loggedIn).not.toContain('href="/landing"');
  });
});
