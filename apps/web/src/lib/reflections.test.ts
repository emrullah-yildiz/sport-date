import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { qualifiesReflectionForProgress } from "./reflections";

describe("reflection progress qualification", () => {
  it("advances the Movement Arc only for attended reflections", () => {
    expect(qualifiesReflectionForProgress("attended")).toBe(true);
    expect(qualifiesReflectionForProgress("left_early")).toBe(false);
    expect(qualifiesReflectionForProgress("did_not_attend")).toBe(false);
  });
});
