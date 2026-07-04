import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runAttendanceReminderSweep: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/attendance-confirmations", () => ({ runAttendanceReminderSweep: mocks.runAttendanceReminderSweep }));
vi.mock("@/lib/db", () => ({ DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {} }));

import { GET } from "./route";

const ORIGINAL = process.env.CRON_SECRET;

function req(auth?: string): Request {
  return new Request("https://keepitup.example/api/internal/attendance-reminders", {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-cron-secret";
  mocks.runAttendanceReminderSweep.mockResolvedValue({ created: 2, simulated: 0, suppressed: 2 });
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

describe("GET /api/internal/attendance-reminders", () => {
  it("runs the sweep for a correct bearer secret", async () => {
    const response = await GET(req("Bearer test-cron-secret"));
    expect(response.status).toBe(200);
    expect(mocks.runAttendanceReminderSweep).toHaveBeenCalledOnce();
  });

  it("401s an unauthenticated or wrong-secret caller without running the sweep", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect(mocks.runAttendanceReminderSweep).not.toHaveBeenCalled();
  });

  it("fails closed (401) when CRON_SECRET is unset, even with a bearer header", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req("Bearer anything"))).status).toBe(401);
    expect(mocks.runAttendanceReminderSweep).not.toHaveBeenCalled();
  });
});
