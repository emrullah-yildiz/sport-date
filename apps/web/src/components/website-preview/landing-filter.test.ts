import { describe, expect, it } from "vitest";
import type { MapDiscoveryState } from "../concepts/PlayMapDiscovery";
import { defaultMapFilters, filterMapGames, mapGames } from "../concepts/play-map-data";
import { patchLandingFilters } from "./landing-filter";

const trip: MapDiscoveryState = {
  view: "list",
  page: 4,
  filters: {
    ...defaultMapFilters,
    dateFrom: "2026-10-03", dateTo: "2026-10-06", sport: "Tennis",
    level: "beginner", language: "English", period: "afternoon", openOnly: true,
    freeOnly: true, sort: "availability", areaId: "bucharest-herastrau",
  },
};

describe("landing filter handoff", () => {
  it("changes destination without losing trip dates or other filters, clearing only the old area and page", () => {
    const next = patchLandingFilters(trip, { destinationId: "barcelona" });
    expect(next).toEqual({
      ...trip, page: 0, filters: { ...trip.filters, destinationId: "barcelona", areaId: "all" },
    });
    expect(trip.filters.areaId).toBe("bucharest-herastrau");
    expect(trip.page).toBe(4);
  });

  it("keeps the selected area when changing sport or reselecting the same destination", () => {
    const next = patchLandingFilters(trip, { sport: "Running", destinationId: "bucharest" });
    expect(next).toEqual({ ...trip, page: 0, filters: { ...trip.filters, sport: "Running" } });
  });

  it("hands the same city and sport to both landing suggestions and full discovery", () => {
    const state: MapDiscoveryState = { view: "map", page: 7, filters: { ...defaultMapFilters } };
    const next = patchLandingFilters(state, { destinationId: "lisbon", sport: "Padel" });
    const results = filterMapGames(mapGames, next.filters);
    expect(results.length).toBeGreaterThan(3);
    expect(results.every(game => game.destinationId === "lisbon" && game.sport === "Padel")).toBe(true);
    expect(next.page).toBe(0);
    expect(next.view).toBe("map");
  });
});
