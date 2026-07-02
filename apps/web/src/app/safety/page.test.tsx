import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Guards the trust/safety-legibility rule (CX-20260702): a signed-OUT visitor
// must be able to READ the general safety guidance before signing up, while the
// personal report / case tracker (member data) stays authenticated and is never
// exposed to signed-out visitors.

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getMemberSafetyCases: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/safety", () => ({ getMemberSafetyCases: mocks.getMemberSafetyCases }));

import SafetyCenterPage from "./page";

async function render() {
  const element = await SafetyCenterPage();
  return renderToStaticMarkup(element);
}

const member = {
  id: "42",
  firstName: "Ana",
  lastName: "Pop",
};

const memberCase = {
  id: "case-abcdef012345",
  category: "harassment",
  status: "actioned" as const,
  priority: "urgent" as const,
  createdAt: "2026-06-01T10:00:00.000Z",
  event: { id: "e1", title: "Easy 5K", sport: "Running" },
  decision: null,
  appeal: null,
  canAppeal: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SafetyCenterPage guidance legibility", () => {
  it("renders the public safety guidance for a signed-out visitor without any auth bounce", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const html = await render();

    // The general guidance (the #guidelines section) is readable while signed out.
    expect(html).toContain('id="guidelines"');
    expect(html).toContain("How safety works here");
    expect(html).toContain("Before the event");
    expect(html).toContain("What the product does not promise");
    // The honest emergency-services line is preserved.
    expect(html).toContain("This service is not an emergency responder.");
    // A calm sign-in path to reporting is offered — not the member tracker itself.
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/signup"');
    // getMemberSafetyCases must NOT be called for a signed-out visitor (no member
    // data is fetched, let alone rendered).
    expect(mocks.getMemberSafetyCases).not.toHaveBeenCalled();
    // No member-tracker chrome leaks to a signed-out visitor.
    expect(html).not.toContain("Submitted safety reports");
    expect(html).not.toContain("Your reports, without the black box.");
  });

  it("shows the report tracker plus the guidance to a signed-in member", async () => {
    mocks.getCurrentUser.mockResolvedValue(member);
    mocks.getMemberSafetyCases.mockResolvedValue([memberCase]);

    const html = await render();

    // Member sees their own tracker...
    expect(html).toContain("Submitted safety reports");
    expect(html).toContain("Case case-abc");
    expect(mocks.getMemberSafetyCases).toHaveBeenCalledWith("42");
    // ...and the same guidance section, sourced from the shared component.
    expect(html).toContain('id="guidelines"');
    expect(html).toContain("How safety works here");
    // The signed-out-only "create a profile" guest CTA is not shown to members.
    expect(html).not.toContain("Your reports stay private to you.");
  });
});
