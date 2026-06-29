export const EVENT_ATTENDANCE_OUTCOMES = ["attended", "left_early", "did_not_attend"] as const;
export const WOULD_JOIN_AGAIN_OPTIONS = ["yes", "no", "prefer_not_to_say"] as const;

export type EventReflectionInput = Readonly<{
  attendance: (typeof EVENT_ATTENDANCE_OUTCOMES)[number];
  wouldJoinAgain: (typeof WOULD_JOIN_AGAIN_OPTIONS)[number];
}>;

export type EventReflectionValidation =
  | { valid: true; data: EventReflectionInput }
  | { valid: false; errors: readonly string[] };

export const MOVEMENT_STAGES = [
  { slug: "warm_up", label: "Warm-up", threshold: 0 },
  { slug: "first_move", label: "First move", threshold: 1 },
  { slug: "finding_rhythm", label: "Finding rhythm", threshold: 3 },
  { slug: "in_motion", label: "In motion", threshold: 6 },
  { slug: "local_pulse", label: "Local pulse", threshold: 10 },
] as const;

export type MovementProgress = Readonly<{
  attendedMoves: number;
  currentStage: (typeof MOVEMENT_STAGES)[number];
  nextStage: (typeof MOVEMENT_STAGES)[number] | null;
  movesToNextStage: number;
  stageProgressPercent: number;
}>;

export function validateEventReflection(raw: unknown): EventReflectionValidation {
  if (!raw || typeof raw !== "object") return { valid: false, errors: ["Event reflection is required."] };
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (!EVENT_ATTENDANCE_OUTCOMES.includes(input.attendance as EventReflectionInput["attendance"])) errors.push("Choose what happened with your attendance.");
  if (!WOULD_JOIN_AGAIN_OPTIONS.includes(input.wouldJoinAgain as EventReflectionInput["wouldJoinAgain"])) errors.push("Choose whether you would join this group again.");
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, data: input as EventReflectionInput };
}

export function calculateMovementProgress(attendedMoves: number): MovementProgress {
  const count = Number.isInteger(attendedMoves) && attendedMoves > 0 ? attendedMoves : 0;
  let currentIndex = 0;
  for (let index = 1; index < MOVEMENT_STAGES.length; index += 1) {
    if (count >= MOVEMENT_STAGES[index].threshold) currentIndex = index;
  }
  const currentStage = MOVEMENT_STAGES[currentIndex];
  const nextStage = MOVEMENT_STAGES[currentIndex + 1] ?? null;
  if (!nextStage) return { attendedMoves: count, currentStage, nextStage: null, movesToNextStage: 0, stageProgressPercent: 100 };
  const range = nextStage.threshold - currentStage.threshold;
  const progress = count - currentStage.threshold;
  return {
    attendedMoves: count,
    currentStage,
    nextStage,
    movesToNextStage: nextStage.threshold - count,
    stageProgressPercent: Math.round((progress / range) * 100),
  };
}
