export const sports = ["Padel", "Running", "Walk"] as const;
export const intentions = ["Dating", "Friendship", "A crew"] as const;
export type Sport = (typeof sports)[number];
export type Intention = (typeof intentions)[number];
export type Stage = "discover" | "details" | "requested" | "review" | "accepted";
export type DemoAction = "details" | "request" | "review" | "accept" | "reset";
export function transition(stage: Stage, action: DemoAction): Stage {
  if (action === "reset") return "discover";
  if (stage === "discover" && action === "details") return "details";
  if (stage === "details" && action === "request") return "requested";
  if (stage === "requested" && action === "review") return "review";
  if (stage === "review" && action === "accept") return "accepted";
  return stage;
}
export function meetingDetail(stage: Stage): string | null {
  return stage === "accepted" ? "Demo meeting point: the blue bench at Example Sports Garden. Fictional location — do not travel here." : null;
}
export const plans: Record<Sport, { title: string; time: string; level: string; area: string; size: string; note: string; bring: string }> = {
  Padel: { title: "A little rally. A lot of laughs.", time: "Saturday · 10:00 · 60 min", level: "First-timers welcome", area: "Riverside neighbourhood", size: "4 people", note: "A gentle warm-up, friendly doubles, and an optional coffee after. Keeping score is optional.", bring: "Trainers, water, and a borrowed or rented racket. Example court cost: €8 per person." },
  Running: { title: "Good company. Easy kilometres.", time: "Sunday · 09:30 · 40 min", level: "Easy, conversational pace", area: "North park neighbourhood", size: "6 people", note: "A relaxed 3 km loop with walking breaks. We start together, stay together, and finish with a stretch.", bring: "Comfortable shoes and water. Example activity: free; any coffee is your choice." },
  Walk: { title: "Take the scenic route to hello.", time: "Sunday · 11:00 · 45 min", level: "Gentle pace · paved route", area: "Old town neighbourhood", size: "5 people", note: "A slow stroll, a few conversation prompts, and room to be yourself. Plenty of chances to pause.", bring: "Comfortable shoes and a weather layer. Example activity: free; step-free route proposed." },
};
