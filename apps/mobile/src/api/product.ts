import type { EventReflectionInput, MovementProgress } from "@sport-date/domain";

import { MobileSessionError, mobileApiFetch } from "../auth/session";

export type MobileDiscoveryEvent = {
  id: string; sport: string; title: string; startsAt: string; timeZone: string;
  areaLabel: string; city: string; placesRemaining: number; hostFirstName: string;
};
export type MobileMemberEvent = {
  id: string; title: string; sport: string; startsAt: string; timeZone: string;
  city: string; areaLabel: string; isHost: boolean; hasEnded: boolean;
  reflection: EventReflectionInput | null;
};
export type MobileRoom = {
  id: string; title: string; sport: string; startsAt: string; timeZone: string;
  hasEnded: boolean; venueName: string; address: string; instructions: string | null; isHost: boolean;
  reflection: EventReflectionInput | null;
  participants: Array<{ userId: string; firstName: string; skillLevel: string }>;
};
export type MobileProgress = MovementProgress & {
  hostedMoves: number; joinedMoves: number;
  recentMoves: Array<{ eventId: string; title: string; sport: string; startsAt: string; role: "host" | "participant" }>;
};
export type MobileProductData = { discovery: MobileDiscoveryEvent[]; events: MobileMemberEvent[]; progress: MobileProgress };

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new MobileSessionError(body.error ?? "Mobile request failed.", response.status);
  return body;
}

export async function loadMobileProduct(): Promise<MobileProductData> {
  const [discoveryResponse, eventsResponse, progressResponse] = await Promise.all([
    mobileApiFetch("/api/mobile/discover?withinDays=7"),
    mobileApiFetch("/api/mobile/events"),
    mobileApiFetch("/api/mobile/progress"),
  ]);
  const [discovery, events, progress] = await Promise.all([
    readJson<{ events: MobileDiscoveryEvent[] }>(discoveryResponse),
    readJson<{ events: MobileMemberEvent[] }>(eventsResponse),
    readJson<{ progress: MobileProgress }>(progressResponse),
  ]);
  return { discovery: discovery.events, events: events.events, progress: progress.progress };
}

export async function loadMobileRoom(eventId: string): Promise<MobileRoom> {
  const response = await mobileApiFetch(`/api/mobile/events/${encodeURIComponent(eventId)}/room`);
  return (await readJson<{ room: MobileRoom }>(response)).room;
}

export async function saveMobileReflection(eventId: string, reflection: EventReflectionInput): Promise<EventReflectionInput> {
  const response = await mobileApiFetch(`/api/mobile/events/${encodeURIComponent(eventId)}/reflection`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reflection),
  });
  return (await readJson<{ reflection: EventReflectionInput }>(response)).reflection;
}
