import { describe, expect, it } from "vitest";

import { calculateProfileReadiness } from "./readiness";

const empty = {
  hasSport: false,
  hasIntro: false,
  hasLanguage: false,
  hasPrompt: false,
  hasPhoto: false,
} as const;

describe("calculateProfileReadiness", () => {
  it("is NOT ready with no sport (the real gate to joining a game)", () => {
    const readiness = calculateProfileReadiness(empty);
    expect(readiness.ready).toBe(false);
    // The essential item is the sport, and it's not done.
    const sport = readiness.items.find((item) => item.id === "sport");
    expect(sport?.essential).toBe(true);
    expect(sport?.done).toBe(false);
  });

  it("is ready the moment a sport exists — enrichment is optional, not a gate", () => {
    const readiness = calculateProfileReadiness({ ...empty, hasSport: true });
    // Ready even with zero enrichment: readiness reflects real capability, not a
    // completion percentage.
    expect(readiness.ready).toBe(true);
    expect(readiness.enrichmentDone).toBe(0);
    expect(readiness.enrichmentTotal).toBe(4);
  });

  it("counts optional enrichment honestly without ever blocking readiness", () => {
    const readiness = calculateProfileReadiness({
      hasSport: true,
      hasIntro: true,
      hasPhoto: true,
      hasLanguage: false,
      hasPrompt: false,
    });
    expect(readiness.ready).toBe(true);
    expect(readiness.enrichmentDone).toBe(2);
  });

  it("treats every non-sport item as optional polish (only sport is essential)", () => {
    const readiness = calculateProfileReadiness(empty);
    const essentials = readiness.items.filter((item) => item.essential);
    expect(essentials).toHaveLength(1);
    expect(essentials[0]?.id).toBe("sport");
  });
});
