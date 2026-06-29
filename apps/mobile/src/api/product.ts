import type { EventReflectionInput, FeedbackTicketInput, MovementProgress, SafetyReportInput } from "@sport-date/domain";

import { MobileSessionError, mobileApiFetch } from "../auth/session";

export type MobileDiscoveryEvent = {
  id: string; sport: string; title: string; startsAt: string; timeZone: string;
  areaLabel: string; city: string; placesRemaining: number; hostUserId: string; hostFirstName: string;
  request: { id: string; status: "pending" | "accepted" | "declined" | "cancelled"; skipCount: number } | null;
};
export type MobileMemberEvent = {
  id: string; title: string; sport: string; startsAt: string; timeZone: string;
  city: string; areaLabel: string; isHost: boolean; hasEnded: boolean;
  reflection: EventReflectionInput | null;
};
export type MobileRoom = {
  id: string; title: string; sport: string; startsAt: string; timeZone: string;
  hasEnded: boolean; venueName: string; address: string; instructions: string | null; isHost: boolean;
  viewerUserId: string;
  latestUpdateId: string | null;
  latestCriticalUpdateId: string | null;
  viewerHasSeenLatestUpdate: boolean;
  viewerCriticalUpdateIntent: "still_in" | "unsure" | "cannot_make" | null;
  criticalUpdateResponseCounts: { stillIn: number; unsure: number; cannotMake: number };
  updates: Array<{ id: string; severity: "routine" | "critical"; changedFields: string[]; summary: string; createdAt: string }>;
  host: { userId: string; firstName: string };
  reflection: EventReflectionInput | null;
  participants: Array<{ userId: string; firstName: string; skillLevel: string; seenLatestUpdate: boolean | null; criticalUpdateIntent: "still_in" | "unsure" | "cannot_make" | null }>;
  hostRequests: MobileHostRequest[];
};
export type MobileHostRequest = {
  id: string; status: "pending" | "accepted" | "declined" | "cancelled"; skipCount: number;
  introduction: string; requesterId: string; requestedAt: string;
  requester: { firstName: string; age: number; bio: string; languages: string[]; skillLevel: string };
};
export type MobileProgress = MovementProgress & {
  hostedMoves: number; joinedMoves: number;
  recentMoves: Array<{ eventId: string; title: string; sport: string; startsAt: string; role: "host" | "participant" }>;
};
export type MobileProductData = { discovery: MobileDiscoveryEvent[]; events: MobileMemberEvent[]; progress: MobileProgress };
export type MobileDeviceSession = {
  id: string; deviceName: string; lastUsedAt: string; refreshExpiresAt: string;
  revokedAt: string | null; current: boolean; active: boolean;
};
export type MobileFeedbackTicket = FeedbackTicketInput & {
  id: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
};

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

export async function requestMobileEvent(eventId: string, introduction = ""): Promise<void> {
  const response = await mobileApiFetch(`/api/mobile/events/${encodeURIComponent(eventId)}/requests`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ introduction }),
  });
  await readJson(response);
}

export async function cancelMobileEventRequest(eventId: string, requestId: string): Promise<void> {
  const response = await mobileApiFetch(`/api/mobile/events/${encodeURIComponent(eventId)}/requests/${encodeURIComponent(requestId)}`, { method: "DELETE" });
  await readJson(response);
}

export async function blockMobileMember(blockedUserId: string): Promise<void> {
  const response = await mobileApiFetch("/api/mobile/safety/blocks", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockedUserId }),
  });
  await readJson(response);
}

export async function reportMobileSafety(report: SafetyReportInput): Promise<{ message: string; priority: string }> {
  const response = await mobileApiFetch("/api/mobile/safety/reports", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(report),
  });
  return readJson(response);
}

export async function decideMobileHostRequest(eventId: string, requestId: string, action: "accept" | "skip"): Promise<{ status: string; skipCount: number }> {
  const response = await mobileApiFetch(`/api/mobile/events/${encodeURIComponent(eventId)}/requests/${encodeURIComponent(requestId)}/decision`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
  });
  return readJson(response);
}

export async function loadMobileDevices(): Promise<MobileDeviceSession[]> {
  const response = await mobileApiFetch("/api/mobile/devices");
  return (await readJson<{ devices: MobileDeviceSession[] }>(response)).devices;
}

export async function revokeMobileDevice(sessionId: string): Promise<void> {
  const response = await mobileApiFetch("/api/mobile/devices", {
    method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }),
  });
  await readJson(response);
}

export async function loadMobileFeedback(): Promise<MobileFeedbackTicket[]> {
  const response = await mobileApiFetch("/api/mobile/feedback");
  return (await readJson<{ tickets: MobileFeedbackTicket[] }>(response)).tickets;
}

export async function submitMobileFeedback(feedback: FeedbackTicketInput): Promise<MobileFeedbackTicket> {
  const response = await mobileApiFetch("/api/mobile/feedback", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(feedback),
  });
  return (await readJson<{ ticket: MobileFeedbackTicket }>(response)).ticket;
}
