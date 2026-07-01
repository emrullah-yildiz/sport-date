import { describe, expect, it } from "vitest";

import { resolveHostEventView } from "./host-event-view";

describe("resolveHostEventView", () => {
  it("shows the post-publish success state only when published=1 is present", () => {
    expect(resolveHostEventView("evt_1", { published: "1" }).justPublished).toBe(true);
    expect(resolveHostEventView("evt_1", {}).justPublished).toBe(false);
    expect(resolveHostEventView("evt_1", { published: "0" }).justPublished).toBe(false);
    expect(resolveHostEventView("evt_1", { published: "true" }).justPublished).toBe(false);
  });

  it("tolerates repeated query params by reading the first value", () => {
    expect(resolveHostEventView("evt_1", { published: ["1", "x"] }).justPublished).toBe(true);
    expect(resolveHostEventView("evt_1", { published: ["0", "1"] }).justPublished).toBe(false);
  });

  it("shares and links to the discovery view so the precise meeting point is never exposed", () => {
    const view = resolveHostEventView("evt_42", { published: "1" });
    expect(view.publicInvitationPath).toBe("/discover/events/evt_42");
    expect(view.publicInvitationPath.startsWith("/discover/")).toBe(true);
    expect(view.managePath).toBe("/hosting");
  });
});
