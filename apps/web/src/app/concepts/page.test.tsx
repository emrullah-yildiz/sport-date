import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({ Barlow_Condensed: () => ({ variable: "concept-type" }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("CONCEPT_NOT_AVAILABLE"); } }));
vi.mock("@/components/concepts/ConceptStudio", () => ({ default: () => null }));
import ConceptsPage from "./page";

afterEach(() => vi.unstubAllEnvs());

describe("local-only design playground", () => {
  it("cannot be rendered in a production deployment", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => ConceptsPage()).toThrow("CONCEPT_NOT_AVAILABLE");
  });
  it("is available in the local development server", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(ConceptsPage()).toBeTruthy();
  });
});
