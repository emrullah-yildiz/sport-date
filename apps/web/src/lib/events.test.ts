import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { eventLanguageMatchesMemberPreference } from "./events";

// These cases pin the discovery language-preference rule that the SQL clause in
// `getDiscoverableEvents` mirrors. The bug (CX-20260630): a brand-new member has
// an empty `languages` set (signup never collects one) and the old strict
// language-overlap filter hid every otherwise-compatible event, leaving the
// discovery feed permanently and silently empty.
describe("discovery language preference", () => {
  it("shows a matching event to a member who has set no languages (previously hidden)", () => {
    // Empty preference => no language filter applied; the event the new member
    // could not see before now matches.
    expect(eventLanguageMatchesMemberPreference([], "English")).toBe(true);
    expect(eventLanguageMatchesMemberPreference([], "Romanian")).toBe(true);
  });

  it("still filters to overlapping languages for a member who has set a language (no regression)", () => {
    // A member with a stated preference keeps the exact overlap behaviour.
    expect(eventLanguageMatchesMemberPreference(["English"], "English")).toBe(true);
    expect(eventLanguageMatchesMemberPreference(["english"], "English")).toBe(true);
    expect(eventLanguageMatchesMemberPreference(["Romanian", "French"], "English")).toBe(false);
    expect(eventLanguageMatchesMemberPreference(["Romanian"], "English")).toBe(false);
  });
});
