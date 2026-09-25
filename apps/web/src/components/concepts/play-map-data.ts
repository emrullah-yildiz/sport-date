import { events, type ConceptEvent, type Sport } from "./concept-data";

/** Fictional discovery fixtures. x/y are positions on a diagram, never coordinates. */
export type MapArea = { id: string; name: string; x: number; y: number };
export type MapDestination = {
  id: string; city: string; country: string; timezone: string; timezoneLabel: string;
  areas: MapArea[];
};
export type MapPeriod = "morning" | "afternoon" | "evening";
export type MapDifficulty = "beginner" | "intermediate" | "advanced" | "all";
export type MapLanguage = "English" | "Romanian" | "Spanish" | "Portuguese";
export type MapGame = ConceptEvent & {
  destinationId: string; areaId: string; date: string; period: MapPeriod;
  difficulty: MapDifficulty; language: MapLanguage; cost: "free" | "shared";
};
export type MapFilters = {
  destinationId: string; dateFrom: string; dateTo: string; sport: "All" | Sport;
  level: "any" | Exclude<MapDifficulty, "all">; period: "any" | MapPeriod;
  language: "any" | MapLanguage; openOnly: boolean; freeOnly: boolean;
  areaId: string; sort: "soonest" | "availability";
};
export type MapCluster = MapArea & {
  areaId: string; destinationId: string; count: number; games: MapGame[];
};

export const destinations: MapDestination[] = [
  {
    id: "bucharest", city: "Bucharest", country: "Romania",
    timezone: "Europe/Bucharest", timezoneLabel: "EEST · UTC+3",
    areas: [
      { id: "bucharest-herastrau", name: "Herăstrău", x: 29, y: 30 },
      { id: "bucharest-floreasca", name: "Floreasca", x: 68, y: 27 },
      { id: "bucharest-aviatorilor", name: "Aviatorilor", x: 38, y: 69 },
      { id: "bucharest-tineretului", name: "Tineretului", x: 76, y: 72 },
    ],
  },
  {
    id: "barcelona", city: "Barcelona", country: "Spain",
    timezone: "Europe/Madrid", timezoneLabel: "CEST · UTC+2",
    areas: [
      { id: "barcelona-gracia", name: "Gràcia", x: 29, y: 30 },
      { id: "barcelona-eixample", name: "Eixample", x: 68, y: 27 },
      { id: "barcelona-poblenou", name: "Poblenou", x: 38, y: 69 },
      { id: "barcelona-sants", name: "Sants", x: 76, y: 72 },
    ],
  },
  {
    id: "lisbon", city: "Lisbon", country: "Portugal",
    timezone: "Europe/Lisbon", timezoneLabel: "WEST · UTC+1",
    areas: [
      { id: "lisbon-alvalade", name: "Alvalade", x: 29, y: 30 },
      { id: "lisbon-avenidas-novas", name: "Avenidas Novas", x: 68, y: 27 },
      { id: "lisbon-alcantara", name: "Alcântara", x: 38, y: 69 },
      { id: "lisbon-parque-das-nacoes", name: "Parque das Nações", x: 76, y: 72 },
    ],
  },
];

export const defaultMapFilters: MapFilters = {
  destinationId: "bucharest", dateFrom: "", dateTo: "", sport: "All", level: "any",
  period: "any", language: "any", openOnly: false, freeOnly: false,
  areaId: "all", sort: "soonest",
};

const days = ["Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const sports: Sport[] = ["Tennis", "Running", "Padel"];
const difficulties: MapDifficulty[] = ["all", "beginner", "intermediate", "advanced"];
const difficultyLabels: Record<MapDifficulty, string> = {
  all: "All levels", beginner: "Beginner friendly", intermediate: "Intermediate", advanced: "Advanced",
};
const periods: MapPeriod[] = ["morning", "afternoon", "evening"];
const startTimes = ["09:00", "14:30", "18:00"];
const localLanguages: MapLanguage[] = ["Romanian", "Spanish", "Portuguese"];
const titles: Record<Sport, string[]> = {
  Tennis: ["A rally, then a coffee.", "Doubles with new faces.", "One more set?", "The friendly rally club."],
  Running: ["The no-rush run club.", "A loop and a catch-up.", "Fresh air, good company.", "The social kilometres."],
  Padel: ["Meet you at the net.", "A friendly game of doubles.", "Padel and new pals.", "Four players. One good plan."],
};

function makeGames(destination: MapDestination, destinationIndex: number): MapGame[] {
  return Array.from({ length: 100 }, (_, index) => {
    const area = destination.areas[index % destination.areas.length];
    const sport = sports[index % sports.length];
    const dateIndex = index % 7;
    const periodIndex = Math.floor(index / 7) % periods.length;
    const difficulty = difficulties[Math.floor(index / 3) % difficulties.length];
    const game: MapGame = {
      id: `${destination.id}-${String(index + 1).padStart(3, "0")}`,
      destinationId: destination.id, areaId: area.id, area: area.name,
      sport, title: titles[sport][Math.floor(index / 3) % 4],
      date: `2026-10-${String(dateIndex + 2).padStart(2, "0")}`,
      day: days[dateIndex], time: startTimes[periodIndex], period: periods[periodIndex],
      difficulty, level: difficultyLabels[difficulty],
      language: Math.floor(index / 4) % 3 === 0 ? localLanguages[destinationIndex] : "English",
      cost: (index + Math.floor(index / 4)) % 3 === 0 ? "shared" : "free",
      places: (index * 5 + Math.floor(index / 7)) % 7,
      duration: sport === "Running" ? "45 min" : sport === "Padel" ? "90 min" : "60 min",
      description: "A fictional social game for the concept preview. Come solo, meet the group, and enjoy playing together.",
    };
    if (destination.id !== "bucharest" || index > 2) return game;
    return {
      ...game, ...events[index], date: index === 0 ? "2026-10-03" : "2026-10-04",
      period: index === 2 ? "evening" : "morning",
      difficulty: index === 2 ? "beginner" : "all", language: "English",
    };
  });
}

/** Three cities × 100 fictional games, independent of real user data or GPS. */
export const mapGames: MapGame[] = destinations.flatMap(makeGames);

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/** Dates compare as destination-local calendar dates; no visitor timezone conversion. */
export function filterMapGames(games: MapGame[], filters: MapFilters): MapGame[] {
  if ((filters.dateFrom && !isValidDate(filters.dateFrom)) || (filters.dateTo && !isValidDate(filters.dateTo))) return [];
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) return [];
  return games.filter(game =>
    game.destinationId === filters.destinationId
    && (!filters.dateFrom || game.date >= filters.dateFrom)
    && (!filters.dateTo || game.date <= filters.dateTo)
    && (filters.sport === "All" || game.sport === filters.sport)
    && (filters.level === "any" || game.difficulty === "all" || game.difficulty === filters.level)
    && (filters.period === "any" || game.period === filters.period)
    && (filters.language === "any" || game.language === filters.language)
    && (!filters.openOnly || game.places > 0)
    && (!filters.freeOnly || game.cost === "free")
    && (filters.areaId === "all" || game.areaId === filters.areaId),
  ).sort((left, right) => {
    if (filters.sort === "availability" && left.places !== right.places) return right.places - left.places;
    return left.date.localeCompare(right.date) || left.time.localeCompare(right.time);
  });
}

/** Aggregate by broad area only. No player positions or precise venue pins exist. */
export function groupMapGames(games: MapGame[], destinationId?: string): MapCluster[] {
  const groups = new Map<string, MapGame[]>();
  for (const game of games) {
    if (destinationId && game.destinationId !== destinationId) continue;
    const key = `${game.destinationId}:${game.areaId}`;
    const group = groups.get(key) ?? [];
    group.push(game);
    groups.set(key, group);
  }
  return destinations.flatMap(destination => destination.areas.flatMap(area => {
    const grouped = groups.get(`${destination.id}:${area.id}`);
    return grouped?.length ? [{ ...area, areaId: area.id, destinationId: destination.id, count: grouped.length, games: grouped }] : [];
  }));
}
