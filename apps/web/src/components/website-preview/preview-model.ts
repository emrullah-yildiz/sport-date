import type { Sport } from "../concepts/concept-data";
import { destinations, type MapGame } from "../concepts/play-map-data";

export type PreviewRequest = "pending" | "accepted";
export type GameDraft = {
  sport: Sport; title: string; level: "all" | "beginner" | "intermediate" | "advanced";
  destinationId: string; areaId: string; date: string; time: string; places: string; meetingPoint: string;
};
export const initialGameDraft: GameDraft = {
  sport: "Tennis", title: "A rally, then a coffee.", level: "all", destinationId: "bucharest",
  areaId: "bucharest-herastrau", date: "2026-10-03", time: "10:00", places: "3", meetingPoint: "Sample court A, by the entrance",
};
export function gameDraftErrors(draft: GameDraft, step: number): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0 || step === 2) {
    if (draft.title.trim().length < 3 || draft.title.trim().length > 80) errors.title = "Give your game a short name (3–80 characters).";
    if (!["Tennis", "Running", "Padel"].includes(draft.sport)) errors.sport = "Choose a sport.";
    if (!["all", "beginner", "intermediate", "advanced"].includes(draft.level)) errors.level = "Choose a level.";
  }
  if (step === 1 || step === 2) {
    const destination = destinations.find(place => place.id === draft.destinationId);
    if (!destination || !destination.areas.some(area => area.id === draft.areaId)) errors.areaId = "Choose an area in your destination.";
    const date = new Date(draft.date + "T12:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== draft.date || draft.date < "2026-09-25") errors.date = "Choose a date on or after 25 September 2026.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) errors.time = "Choose a start time.";
    if (!/^\d+$/.test(draft.places) || Number(draft.places) < 1 || Number(draft.places) > 12) errors.places = "Choose 1–12 open places.";
    if (draft.meetingPoint.trim().length < 3 || draft.meetingPoint.trim().length > 120) errors.meetingPoint = "Add a short fictional meeting point.";
  }
  return errors;
}

/** Exact meeting points are deliberately excluded from discovery game records. */
export function draftToGame(draft: GameDraft, id: string): MapGame {
  if (Object.keys(gameDraftErrors(draft, 2)).length) throw new Error("Incomplete game draft");
  const destination = destinations.find(place => place.id === draft.destinationId)!;
  const area = destination.areas.find(value => value.id === draft.areaId)!;
  const hour = Number(draft.time.slice(0, 2));
  return {
    id, sport: draft.sport, title: draft.title.trim(), destinationId: destination.id, areaId: area.id, area: area.name,
    date: draft.date, day: new Date(draft.date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }), time: draft.time,
    places: Number(draft.places), duration: "60 min", difficulty: draft.level,
    level: { all: "All levels", beginner: "Beginner friendly", intermediate: "Intermediate", advanced: "Advanced" }[draft.level],
    period: hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening", language: "English", cost: "free",
    description: "A relaxed game with a few new faces. Come solo. We’ll play together.",
  };
}
export function joinOutcome(signedIn: boolean, places: number, ownGame: boolean, current?: PreviewRequest): "signin" | "full" | "hosting" | PreviewRequest {
  if (ownGame) return "hosting";
  if (current) return current;
  if (places < 1) return "full";
  return signedIn ? "pending" : "signin";
}
export function maySeeMeetingPoint(signedIn: boolean, ownGame: boolean, state?: PreviewRequest) {
  return signedIn && (ownGame || state === "accepted");
}
