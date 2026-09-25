/** All records are fictional, shared by every concept, and never sent to an API. */
export type ThemeId = "cards" | "clubhouse" | "map";
export type Sport = "Tennis" | "Running" | "Padel";
export type ViewId = "discover" | "profile" | "event" | "progress";
export type RequestState = "idle" | "pending" | "accepted" | "played";
export type ConceptEvent = {
  id: string; sport: Sport; title: string; day: string; time: string;
  area: string; places: number; duration: string; level: string; description: string;
};
export const themes: { id: ThemeId; number: string; name: string; description: string }[] = [
  { id: "cards", number: "01", name: "Player Cards", description: "A little collectible. A lot of personality." },
  { id: "clubhouse", number: "02", name: "Clubhouse", description: "Your kind of people. Your new favourite ritual." },
  { id: "map", number: "03", name: "Play Map", description: "A new way to find your next move." },
];
export const events: ConceptEvent[] = [
  { id: "rally", sport: "Tennis", title: "A rally, then a coffee.", day: "Saturday", time: "10:00", area: "Herăstrău", places: 2, duration: "60 min", level: "All levels", description: "Easy doubles, a few missed shots, and a coffee afterwards. Come solo. We’ll mix up the teams." },
  { id: "run", sport: "Running", title: "The no-rush run club.", day: "Sunday", time: "09:30", area: "Floreasca", places: 4, duration: "45 min", level: "Easy pace", description: "A conversational loop through the park. We stay together, take a breather when we want, and finish with something cold." },
  { id: "padel", sport: "Padel", title: "Meet you at the net.", day: "Sunday", time: "17:00", area: "Aviatorilor", places: 1, duration: "90 min", level: "Beginner friendly", description: "New to padel? Same energy. A gentle warm-up, friendly doubles, and plenty of time to learn each other’s names." },
];
export const person = {
  name: "Mara", age: 28, city: "Bucharest", initials: "MA",
  interests: ["Coffee after", "Making friends", "Outdoor days"],
  bio: "Here for a good rally and an even better coffee. Usually the one saying ‘one more game?’",
  sports: {
    Tennis: { level: "Intermediate", frequency: "Weekly", segments: 2, style: "A friendly rally" },
    Running: { level: "Beginner", frequency: "Casual", segments: 1, style: "Conversation pace" },
    Padel: { level: "Beginner", frequency: "Monthly", segments: 1, style: "Learning together" },
  },
};
export const milestones = [
  { count: 1, title: "First move", reward: "First edition" },
  { count: 3, title: "Finding rhythm", reward: "Colour shift" },
  { count: 6, title: "In motion", reward: "Court lines" },
  { count: 10, title: "Local pulse", reward: "Holographic" },
];
export function visibleEvents(sport: Sport | "All", empty = false) {
  return empty ? [] : events.filter(event => sport === "All" || event.sport === sport);
}
export function nextRequestState(current: RequestState, action: "request" | "accept" | "attend" | "reset"): RequestState {
  if (action === "reset") return "idle";
  if (action === "request" && current === "idle") return "pending";
  if (action === "accept" && current === "pending") return "accepted";
  if (action === "attend" && current === "accepted") return "played";
  return current;
}
export function cyclePhoto(index: number, step: number, count: number) {
  return count > 0 ? ((index + step) % count + count) % count : 0;
}
export type DiscoveryProps = {
  events: ConceptEvent[];
  onEvent: (event: ConceptEvent) => void;
  onProfile: () => void;
  onProgress: () => void;
};
