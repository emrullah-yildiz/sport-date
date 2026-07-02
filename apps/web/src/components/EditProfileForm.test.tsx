import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EditProfileConfirmation } from "./EditProfileForm";

// The container (EditProfileForm) PATCHes on submit and only renders the
// confirmation after a successful save — neither the fetch nor the success
// re-render is run by renderToStaticMarkup. So, exactly like the verified
// FeedbackConfirmation, the success moment is asserted directly through the
// presentational EditProfileConfirmation — the exact JSX the container mounts on
// success — where the acceptance-criteria markup lives (focusable, polite live
// region). Focus movement itself is driven by the container's attachConfirmation
// callback ref and is exercised live in the app.
//
// Regression target: CX-20260702-profile-edit-save-hard-reload-no-focus-or-announcement.
// The old success path called window.location.reload() right after setting the
// message, which destroyed the role="status" confirmation before assistive tech
// could read it and dropped focus to <body>. The source tripwires below fail the
// build if that anti-pattern returns.

const POLITE_LIVE_REGION = /role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/;
const FOCUSABLE_STATUS = /<p[^>]*tabindex="-1"/i;

function render() {
  return renderToStaticMarkup(<EditProfileConfirmation />);
}

const source = readFileSync(fileURLToPath(new URL("./EditProfileForm.tsx", import.meta.url)), "utf8");

describe("EditProfileForm save confirmation (success state)", () => {
  it("announces the calm result inside a polite live region that survives the save", () => {
    const html = render();
    expect(html).toMatch(POLITE_LIVE_REGION);
    expect(html).toContain("Profile updated.");
  });

  it("makes the confirmation a keyboard focus target so focus moves to it, not <body>", () => {
    // tabindex=-1 lets the container's callback ref move focus here after a
    // successful save — a keyboard / screen-reader member is never dumped to
    // <body> as the old window.location.reload() did.
    expect(render()).toMatch(FOCUSABLE_STATUS);
  });

  it("stays calm and dignified — no gamification of profile edits", () => {
    expect(render()).not.toMatch(/streak|score|points|badge|keep it up|well done/i);
  });
});

describe("EditProfileForm save path (regression: no hard reload)", () => {
  it("never reloads the document on save — the confirmation is not torn down", () => {
    // The exact anti-pattern this ticket fixes. A full-document reload destroys
    // the role="status" confirmation before it can be announced and drops focus
    // to <body>. It must stay gone.
    expect(source).not.toMatch(/window\.location\.reload/);
  });

  it("resolves in place via router.refresh() so rendered sections re-sync without a hard nav", () => {
    expect(source).toContain("router.refresh()");
  });

  it("keeps a separate role=alert for a failed save so the editor stays usable", () => {
    // Errors keep their own alert region; a failed save re-enables the button
    // (setSaving(false)) and never overwrites the success confirmation.
    expect(source).toMatch(/role="alert"/);
    expect(source).toMatch(/setSaving\(false\)/);
  });
});
