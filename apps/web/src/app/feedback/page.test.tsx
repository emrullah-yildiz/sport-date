import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// The feedback page is a server component that calls getCurrentUser() and
// redirects unauthenticated members, so it isn't rendered here. The headline /
// subhead copy is static, so — like the existing FeedbackWorkspace source
// tripwires — it is asserted directly against the source. This guards the
// reframe (CX-20260701-feedback-headline-assumes-breakage-excludes-ideas): the
// top-of-page copy must welcome ideas, kind words, AND problems, matching the
// categories the form actually accepts, rather than assuming something broke.
const source = readFileSync(fileURLToPath(new URL("./page.tsx", import.meta.url)), "utf8");

describe("feedback page headline welcomes ideas, praise, and problems", () => {
  it("no longer frames feedback as only a breakage report", () => {
    // The old headline "Tell us where the rhythm broke." assumed a failure and
    // told members with an idea or kind word that the page wasn't for them.
    expect(source).not.toContain("where the rhythm broke");
    expect(source).not.toContain("what happened instead");
  });

  it("invites the full range the form accepts (idea, kind word, and problem)", () => {
    // Mirrors the form's own categories ("An idea for improvement", etc.) so a
    // member arriving with something positive or forward-looking feels invited.
    expect(source).toMatch(/idea/i);
    expect(source).toMatch(/kind word/i);
    // The apostrophe is written as the &apos; entity in JSX source.
    expect(source).toMatch(/didn(&apos;|&#x27;|')t work/i);
  });

  it("keeps the brand's rhythm/movement voice", () => {
    expect(source).toMatch(/rhythm/i);
  });

  it("stays a single h1 and calm, non-marketing", () => {
    // Exactly one page heading; no hype language.
    expect(source.match(/<h1>/g)?.length ?? 0).toBe(1);
    expect(source).not.toMatch(/amazing|revolution|world-class|best-ever/i);
  });
});
