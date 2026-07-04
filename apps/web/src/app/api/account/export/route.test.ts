import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

import { getDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { GET } from "./route";

// The account row the big users/user_sports SELECT returns, including the new
// private reliability fields (CX-20260704 item 3).
const ACCOUNT_ROW = {
  id: 202, email: "ana@example.com", first_name: "Ana", last_name: "P", date_of_birth: "1994-01-01",
  location: "Bucharest", timezone: "Europe/Bucharest", bio: "", languages: ["English"], seeking: "playing partners",
  email_verified: true, accepted_terms_at: "2026-01-01T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z", personality_prompts: null,
  gender: null, gender_self_describe: null, gender_visible: false,
  sexual_orientation: null, orientation_self_describe: null, orientation_consent_at: null, orientation_visible: false,
  late_cancellation_streak: 2, late_cancellation_streak_started_at: "2026-06-01T00:00:00.000Z",
  reliability_paused_until: null, sports: [],
};

const ATTENDANCE_ROW = { event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: "confirmed", reminded_at: "2026-07-01T09:00:00.000Z", responded_at: "2026-07-01T09:05:00.000Z", created_at: "2026-07-01T09:00:00.000Z" };

// A sequential sql mock that answers each query by matching its text, so we don't
// depend on call ordering: the account SELECT, the attendance-confirmations SELECT,
// and [] for everything else.
function mockDb() {
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    if (text.includes("user_sports") && text.includes("FROM users")) return Promise.resolve([ACCOUNT_ROW]);
    if (text.includes("event_attendance_confirmations")) return Promise.resolve([ATTENDANCE_ROW]);
    void values;
    return Promise.resolve([]);
  });
  vi.mocked(getDatabase).mockReturnValue(sql as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb();
});

describe("GET /api/account/export — GDPR Art. 15 completeness (CX-20260704 item 3)", () => {
  it("401s when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("includes the member's own attendance-confirmation history and private reliability fields", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "202", firstName: "Ana" } as never);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    // The member's own confirm/cancel history is present…
    expect(body.attendanceConfirmations).toEqual([ATTENDANCE_ROW]);
    // …and their private reliability standing (their own data, never shown to peers).
    expect(body.account.reliability).toEqual({
      lateCancellationStreak: 2,
      lateCancellationStreakStartedAt: "2026-06-01T00:00:00.000Z",
      pausedUntil: null,
    });
  });
});
