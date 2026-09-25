import { describe, expect, it } from "vitest";
import { events } from "./concept-data";
import {
  defaultMapFilters, destinations, filterMapGames, groupMapGames, mapGames,
  type MapFilters, type MapGame,
} from "./play-map-data";

function filtered(overrides: Partial<MapFilters> = {}) {
  return filterMapGames(mapGames, { ...defaultMapFilters, ...overrides });
}

describe("fictional travel discovery data", () => {
  it("has 100 unique games per city and retains the three original Bucharest events", () => {
    expect(mapGames).toHaveLength(300);
    expect(new Set(mapGames.map(game => game.id)).size).toBe(300);
    for (const destination of destinations) {
      expect(filtered({ destinationId: destination.id })).toHaveLength(100);
      expect(destination.areas).toHaveLength(4);
    }
    events.forEach((event, index) => expect(mapGames[index]).toMatchObject(event));
  });

  it("contains coarse diagram anchors only, without venue or participant coordinates", () => {
    const prohibited = new Set(["lat", "lng", "latitude", "longitude", "address", "coordinates", "venue"]);
    for (const game of mapGames) expect(Object.keys(game).some(key => prohibited.has(key))).toBe(false);
    for (const destination of destinations) {
      for (const area of destination.areas) {
        expect(Object.keys(area).sort()).toEqual(["id", "name", "x", "y"]);
        expect(area.x).toBeGreaterThan(0);
        expect(area.x).toBeLessThan(100);
        expect(area.y).toBeGreaterThan(0);
        expect(area.y).toBeLessThan(100);
      }
    }
  });

  it("keeps destination and inclusive trip dates together", () => {
    const result = filtered({ destinationId: "barcelona", dateFrom: "2026-10-03", dateTo: "2026-10-05" });
    expect(result.length).toBeGreaterThan(0);
    expect(new Set(result.map(game => game.destinationId))).toEqual(new Set(["barcelona"]));
    expect(new Set(result.map(game => game.date))).toEqual(new Set(["2026-10-03", "2026-10-04", "2026-10-05"]));
    expect(filtered({ dateFrom: "2026-10-04", dateTo: "2026-10-04" }).every(game => game.date === "2026-10-04")).toBe(true);
  });

  it("supports either trip boundary and rejects invalid or reversed ranges", () => {
    expect(filtered({ dateFrom: "2026-10-06" }).every(game => game.date >= "2026-10-06")).toBe(true);
    expect(filtered({ dateTo: "2026-10-03" }).every(game => game.date <= "2026-10-03")).toBe(true);
    expect(filtered({ dateFrom: "2026-10-07", dateTo: "2026-10-03" })).toEqual([]);
    expect(filtered({ dateFrom: "2026-02-30" })).toEqual([]);
    expect(filtered({ dateTo: "next Tuesday" })).toEqual([]);
  });

  it("combines sport, level, language, time, availability and price filters", () => {
    const sample: MapGame = {
      ...mapGames[100], sport: "Tennis", difficulty: "beginner", language: "English",
      period: "evening", places: 2, cost: "free", date: "2026-10-04",
    };
    const filters: MapFilters = {
      ...defaultMapFilters, destinationId: "barcelona", dateFrom: "2026-10-03", dateTo: "2026-10-05",
      sport: "Tennis", level: "beginner", language: "English", period: "evening",
      openOnly: true, freeOnly: true, areaId: sample.areaId,
    };
    const excluded: MapGame[] = [
      { ...sample, id: "wrong-sport", sport: "Running" },
      { ...sample, id: "wrong-level", difficulty: "advanced" },
      { ...sample, id: "wrong-language", language: "Spanish" },
      { ...sample, id: "wrong-time", period: "morning" },
      { ...sample, id: "full", places: 0 },
      { ...sample, id: "shared-cost", cost: "shared" },
      { ...sample, id: "wrong-area", areaId: "barcelona-sants" },
    ];
    expect(filterMapGames([sample, ...excluded], filters)).toEqual([sample]);
    expect(filterMapGames([{ ...sample, difficulty: "all" }], filters)).toHaveLength(1);
  });

  it("filters real fixtures by all offered languages and day periods", () => {
    for (const [destinationId, language] of [["bucharest", "Romanian"], ["barcelona", "Spanish"], ["lisbon", "Portuguese"]] as const) {
      const result = filtered({ destinationId, language });
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(game => game.language === language)).toBe(true);
    }
    for (const period of ["morning", "afternoon", "evening"] as const) {
      const result = filtered({ period });
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(game => game.period === period)).toBe(true);
    }
  });

  it("provides a plausible visitor choice for each sport and city", () => {
    for (const destination of destinations) {
      for (const sport of ["Tennis", "Running", "Padel"] as const) {
        expect(filtered({ destinationId: destination.id, sport, language: "English", openOnly: true }).length).toBeGreaterThan(0);
      }
      for (let day = 2; day <= 8; day++) {
        const date = `2026-10-0${day}`;
        expect(filtered({ destinationId: destination.id, dateFrom: date, dateTo: date, openOnly: true }).length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps local start times consistent with the displayed time-of-day boundaries", () => {
    for (const game of mapGames) {
      const hour = Number(game.time.split(":")[0]);
      expect(game.period).toBe(hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening");
    }
    expect(mapGames.find(game => game.id === "padel")?.period).toBe("evening");
  });

  it("sorts by local date and time, or available places, with stable ties", () => {
    const base = mapGames[0];
    const first = { ...base, id: "first", date: "2026-10-03", time: "10:00", places: 3 };
    const second = { ...first, id: "second" };
    const early = { ...first, id: "early", time: "09:00", places: 1 };
    const nextDay = { ...first, id: "tomorrow", date: "2026-10-04", places: 5 };
    const source = [first, nextDay, second, early];
    expect(filterMapGames(source, defaultMapFilters).map(game => game.id)).toEqual(["early", "first", "second", "tomorrow"]);
    expect(filterMapGames(source, { ...defaultMapFilters, sort: "availability" }).map(game => game.id)).toEqual(["tomorrow", "first", "second", "early"]);
    expect(source.map(game => game.id)).toEqual(["first", "tomorrow", "second", "early"]);
  });

  it("conserves every filtered game exactly once in broad-area clusters", () => {
    for (const destination of destinations) {
      for (const filters of [{}, { sport: "Tennis" as const, openOnly: true }, { language: "English" as const, freeOnly: true }]) {
        const games = filtered({ ...filters, destinationId: destination.id });
        const clusters = groupMapGames(games, destination.id);
        expect(clusters.length).toBeLessThanOrEqual(4);
        expect(clusters.reduce((total, cluster) => total + cluster.count, 0)).toBe(games.length);
        expect(new Set(clusters.flatMap(cluster => cluster.games.map(game => game.id)))).toEqual(new Set(games.map(game => game.id)));
        expect(clusters.every(cluster => cluster.games.every(game => game.areaId === cluster.areaId))).toBe(true);
      }
    }
    expect(groupMapGames(mapGames).reduce((sum, cluster) => sum + cluster.count, 0)).toBe(300);
    expect(groupMapGames(mapGames, "lisbon").reduce((sum, cluster) => sum + cluster.count, 0)).toBe(100);
  });

  it("returns honest empty results rather than silently changing the trip", () => {
    expect(filtered({ dateFrom: "2027-01-01" })).toEqual([]);
    expect(filtered({ destinationId: "unknown" })).toEqual([]);
    expect(filtered({ destinationId: "lisbon", areaId: "bucharest-herastrau" })).toEqual([]);
    expect(filtered({ destinationId: "lisbon", language: "Romanian" })).toEqual([]);
    expect(groupMapGames([])).toEqual([]);
  });
});
