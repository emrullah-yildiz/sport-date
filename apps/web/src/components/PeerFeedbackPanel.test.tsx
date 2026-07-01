import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// next/navigation's useRouter is only needed for its refresh() on submit, which the
// static render never invokes. Stub it so the client component renders on the server.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import PeerFeedbackPanel, { type PeerFeedbackTargetView } from "./PeerFeedbackPanel";

function target(overrides: Partial<PeerFeedbackTargetView> = {}): PeerFeedbackTargetView {
  return {
    userId: "9",
    firstName: "Bea",
    isHost: false,
    submitted: false,
    editable: true,
    given: null,
    ...overrides,
  };
}

function render(targets: PeerFeedbackTargetView[]) {
  return renderToStaticMarkup(<PeerFeedbackPanel eventId="11111111-1111-4111-8111-111111111111" targets={targets} />);
}

describe("PeerFeedbackPanel empty-default guard", () => {
  it("renders nothing when there are no co-attendees to note", () => {
    expect(render([])).toBe("");
  });

  it("pre-selects no radio for a fresh target, so an idle click cannot file an empty note", () => {
    const html = render([target()]);
    // Not a single radio is checked in the initial (nothing-said) state.
    expect(html).not.toMatch(/type="radio"[^>]*checked/);
    expect(html).not.toMatch(/checked[^>]*type="radio"/);
  });

  it("disables the submit button until the member says something", () => {
    const html = render([target()]);
    // The record button starts disabled and the guidance hint is shown.
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Record privately<\/button>/);
    expect(html).toMatch(/Answer at least one question, or leave a private note/);
  });

  it("re-seeds and enables editing when a prior note exists within the edit window", () => {
    const html = render([
      target({
        submitted: true,
        editable: true,
        given: { showedUp: "yes", feltRespected: "yes", feltSafe: "prefer_not_to_say", note: "kind" },
      }),
    ]);
    // A prior substantive answer is re-checked, and submit is enabled (Update label).
    expect(html).toMatch(/value="yes"[^>]*checked|checked[^>]*value="yes"/);
    expect(html).toMatch(/<button[^>]*>Update private note<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Update private note<\/button>/);
  });

  it("shows the locked state instead of a mutable form once the edit window has passed", () => {
    const html = render([
      target({ submitted: true, editable: false, given: { showedUp: "yes", feltRespected: "yes", feltSafe: "yes", note: null } }),
    ]);
    expect(html).toMatch(/it is now locked/);
    expect(html).not.toMatch(/<form/);
  });

  it("keeps the Report/Block safety reminder present and never replaces it", () => {
    const html = render([target()]);
    expect(html).toMatch(/not a substitute for reporting/i);
  });
});
