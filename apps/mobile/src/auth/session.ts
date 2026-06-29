import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_KEY = "sport_date.device_id";
const SESSION_KEY = "sport_date.mobile_session";
const CLIENT_HEADER = "mobile-v1";
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

type StoredSession = {
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
};

export type MobileMember = { id?: string; firstName: string; location?: string };
type LoginResponse = StoredSession & { member: MobileMember };
let refreshInFlight: Promise<StoredSession> | null = null;

export class MobileSessionError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "MobileSessionError";
  }
}

export function mobileApiConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_API_URL?.trim());
}

function apiOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configured) throw new MobileSessionError("Mobile API is not configured.");
  const url = new URL(configured);
  const localDevelopment = __DEV__ && ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname);
  if (url.protocol !== "https:" && !localDevelopment) throw new MobileSessionError("Mobile API must use HTTPS.");
  return url.origin;
}

async function getOrCreateDeviceId(): Promise<string> {
  const stored = await SecureStore.getItemAsync(DEVICE_KEY, SECURE_OPTIONS);
  if (stored) return stored;
  const deviceId = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_KEY, deviceId, SECURE_OPTIONS);
  return deviceId;
}

async function getStoredSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY, SECURE_OPTIONS);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.accessExpiresAt || !parsed.refreshExpiresAt) throw new Error("Incomplete session");
    return parsed;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY, SECURE_OPTIONS);
    return null;
  }
}

async function storeSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), SECURE_OPTIONS);
}

export async function clearMobileSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY, SECURE_OPTIONS);
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json() as Record<string, unknown>; }
  catch { return {}; }
}

function messageFrom(body: Record<string, unknown>, fallback: string): string {
  return typeof body.error === "string" ? body.error : fallback;
}

export async function loginMobile(email: string, password: string): Promise<LoginResponse> {
  const deviceId = await getOrCreateDeviceId();
  const response = await fetch(`${apiOrigin()}/api/mobile/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Sport-Date-Client": CLIENT_HEADER },
    body: JSON.stringify({ email, password, deviceId, deviceName: `Sport Date on ${Platform.OS}` }),
  });
  const body = await responseJson(response);
  if (!response.ok) throw new MobileSessionError(messageFrom(body, "Sign in failed."), response.status);
  const session = body as LoginResponse;
  await storeSession(session);
  return session;
}

async function rotateSession(): Promise<StoredSession> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const session = await getStoredSession();
    if (!session) throw new MobileSessionError("Sign in required.", 401);
    const deviceId = await getOrCreateDeviceId();
    const response = await fetch(`${apiOrigin()}/api/mobile/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sport-Date-Client": CLIENT_HEADER },
      body: JSON.stringify({ refreshToken: session.refreshToken, deviceId }),
    });
    const body = await responseJson(response);
    if (!response.ok) {
      await clearMobileSession();
      throw new MobileSessionError(messageFrom(body, "Session expired. Sign in again."), response.status);
    }
    const next = body as StoredSession;
    await storeSession(next);
    return next;
  })();
  try { return await refreshInFlight; }
  finally { refreshInFlight = null; }
}

function requiresRefresh(session: StoredSession): boolean {
  return new Date(session.accessExpiresAt).getTime() <= Date.now() + 30_000;
}

async function fetchWithSession(path: string, init: RequestInit, session: StoredSession): Promise<Response> {
  const deviceId = await getOrCreateDeviceId();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  headers.set("X-Sport-Date-Client", CLIENT_HEADER);
  headers.set("X-Sport-Date-Device", deviceId);
  return fetch(`${apiOrigin()}${path}`, { ...init, headers });
}

export async function mobileApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!path.startsWith("/api/mobile/") || path.includes("//")) throw new MobileSessionError("Refusing an unsafe mobile API path.");
  let session = await getStoredSession();
  if (!session) throw new MobileSessionError("Sign in required.", 401);
  if (requiresRefresh(session)) session = await rotateSession();
  let response = await fetchWithSession(path, init, session);
  if (response.status === 401) {
    session = await rotateSession();
    response = await fetchWithSession(path, init, session);
  }
  return response;
}

export async function restoreMobileMember(): Promise<MobileMember | null> {
  if (!mobileApiConfigured()) return null;
  try {
    const response = await mobileApiFetch("/api/mobile/me");
    if (!response.ok) return null;
    const body = await responseJson(response);
    const member = body.member as MobileMember | undefined;
    return member?.firstName ? member : null;
  } catch (error) {
    if (error instanceof MobileSessionError && error.status === 401) return null;
    throw error;
  }
}

export async function logoutMobile(): Promise<void> {
  const session = await getStoredSession();
  if (session) {
    try {
      const deviceId = await getOrCreateDeviceId();
      await fetch(`${apiOrigin()}/api/mobile/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Sport-Date-Client": CLIENT_HEADER },
        body: JSON.stringify({ refreshToken: session.refreshToken, deviceId }),
      });
    } finally {
      await clearMobileSession();
    }
  }
}
