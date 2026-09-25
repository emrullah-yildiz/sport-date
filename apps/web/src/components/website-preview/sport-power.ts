import type { Sport } from "../concepts/concept-data";

/** Local demonstration only. Production feedback and reveal rules remain server-owned. */
export type SportPowerEvent = {
  id: string;
  sport: Sport;
  completed: boolean;
  attendees: { id: string; accepted: boolean; attended: boolean }[];
};
export type SportPowerFeedback = {
  eventId: string;
  fromUserId: string;
  toUserId: string;
  positive: boolean;
  blocked: boolean;
  released: boolean;
  finalized: boolean;
};
/** Private award ledger: no review contents or giver identity. */
export type SportPowerAward = { eventId: string; recipientId: string; sport: Sport };
export type SportPowerResult = {
  awards: readonly SportPowerAward[];
  awarded: boolean;
  reason: "awarded" | "duplicate" | "ineligible" | "not-positive";
};

export function awardSportPower(
  awards: readonly SportPowerAward[], event: SportPowerEvent, feedback: SportPowerFeedback,
): SportPowerResult {
  const qualified = (id: string) => event.attendees.some(person => person.id === id && person.accepted && person.attended);
  if (!event.id || !feedback.fromUserId || !feedback.toUserId || event.id !== feedback.eventId
    || !event.completed || !feedback.released || !feedback.finalized || feedback.blocked
    || feedback.fromUserId === feedback.toUserId
    || !qualified(feedback.fromUserId) || !qualified(feedback.toUserId)) {
    return { awards, awarded: false, reason: "ineligible" };
  }
  if (!feedback.positive) return { awards, awarded: false, reason: "not-positive" };
  // The event/recipient pair, rather than a review or its author, owns the single point.
  if (awards.some(award => award.eventId === event.id && award.recipientId === feedback.toUserId)) {
    return { awards, awarded: false, reason: "duplicate" };
  }
  return {
    awards: [...awards, { eventId: event.id, recipientId: feedback.toUserId, sport: event.sport }],
    awarded: true,
    reason: "awarded",
  };
}

export function getSportPower(awards: readonly SportPowerAward[], recipientId: string): Record<Sport, number> {
  const power: Record<Sport, number> = { Tennis: 0, Running: 0, Padel: 0 };
  const countedEvents = new Set<string>();
  for (const award of awards) {
    if (award.recipientId !== recipientId || countedEvents.has(award.eventId)) continue;
    countedEvents.add(award.eventId);
    power[award.sport] += 1;
  }
  return power;
}
