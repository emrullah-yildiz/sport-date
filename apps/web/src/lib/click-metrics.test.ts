import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  getDatabase: () => mocks.sql,
  DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {},
}));

import {
  CLICK_METRIC_EVENTS,
  CLICK_METRIC_PATH_CLASSES,
  classifyClickPath,
  isClickMetricEvent,
  recordClickMetric,
  summarizeClickMetrics,
} from "./click-metrics";

function sqlTextOf(call: unknown[]): string {
  return (call[0] as readonly string[]).join(" ");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sql.mockResolvedValue([]);
});

describe("click-metric event allowlist", () => {
  it("accepts exactly the fixed event names and nothing else", () => {
    for (const event of CLICK_METRIC_EVENTS) expect(isClickMetricEvent(event)).toBe(true);
    for (const junk of ["", "landing_cta_JOIN", "pageview", "user:42", 42, null, undefined, {}]) {
      expect(isClickMetricEvent(junk)).toBe(false);
    }
  });
});

describe("classifyClickPath — raw paths collapse to coarse page classes", () => {
  it("maps every known surface to its class", () => {
    expect(classifyClickPath("/")).toBe("/");
    expect(classifyClickPath("/landing")).toBe("/");
    expect(classifyClickPath("/signup")).toBe("/signup");
    expect(classifyClickPath("/discover")).toBe("/discover");
    expect(classifyClickPath("/discover/events/abc")).toBe("/discover");
    expect(classifyClickPath("/events/new")).toBe("/events/*");
    expect(classifyClickPath("/events/9a1b")).toBe("/events/*");
    expect(classifyClickPath("/e/9a1b")).toBe("/e/*");
    expect(classifyClickPath("/research")).toBe("/research");
    expect(classifyClickPath("/research/bucharest")).toBe("/research");
  });

  it("never returns free text: unknown, decorated, or malformed input is a fixed class", () => {
    // A raw path could act as a quasi-identifier — only classes may come out.
    for (const path of ["/profile", "/events-new", "/eel", "/discovery", "weird", "", "/login?next=/x"]) {
      expect(CLICK_METRIC_PATH_CLASSES).toContain(classifyClickPath(path));
    }
    expect(classifyClickPath("/profile")).toBe("other");
    expect(classifyClickPath("/signup?ref=abc#top")).toBe("/signup");
    expect(classifyClickPath("  /SIGNUP ")).toBe("/signup");
    expect(classifyClickPath(undefined)).toBe("other");
    expect(classifyClickPath(42)).toBe("other");
    expect(classifyClickPath({ toString: () => "/signup" })).toBe("other");
  });
});

describe("recordClickMetric — aggregate-only upsert", () => {
  it("bumps one (day, event, path_class) counter and binds nothing else", async () => {
    await recordClickMetric("landing_cta_join", "/");
    expect(mocks.sql).toHaveBeenCalledTimes(1);
    const call = mocks.sql.mock.calls[0];
    const text = sqlTextOf(call);
    expect(text).toContain("INSERT INTO click_metrics_daily");
    expect(text).toContain("CURRENT_DATE");
    expect(text).toContain("ON CONFLICT (day, event, path_class)");
    expect(text).toContain("count = click_metrics_daily.count + 1");
    // Structural anonymity: exactly two bound values (event + path class) —
    // the statement physically cannot transport an identifier.
    expect(call.slice(1)).toEqual(["landing_cta_join", "/"]);
  });

  it("its SQL references no identifier column of any kind", async () => {
    await recordClickMetric("survey_completed", "/research");
    const text = sqlTextOf(mocks.sql.mock.calls[0]).toLowerCase();
    for (const forbidden of ["user", "session", "ip", "agent", "email", "cookie"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});

describe("summarizeClickMetrics — daily counts for the owner surface", () => {
  it("maps rows (Date days, string counts) to a stable JSON shape", async () => {
    mocks.sql.mockResolvedValue([
      { day: new Date("2026-07-06T00:00:00.000Z"), event: "signup_started", path_class: "/signup", count: "7" },
      { day: "2026-07-05", event: "landing_cta_join", path_class: "/", count: 3 },
    ]);
    const rows = await summarizeClickMetrics(14);
    expect(rows).toEqual([
      { day: "2026-07-06", event: "signup_started", pathClass: "/signup", count: 7 },
      { day: "2026-07-05", event: "landing_cta_join", pathClass: "/", count: 3 },
    ]);
    // The window is bound as a single integer parameter.
    expect(mocks.sql.mock.calls[0].slice(1)).toEqual([13]);
  });

  it("clamps the window to 1..90 days", async () => {
    await summarizeClickMetrics(0);
    await summarizeClickMetrics(9999);
    expect(mocks.sql.mock.calls[0].slice(1)).toEqual([0]);
    expect(mocks.sql.mock.calls[1].slice(1)).toEqual([89]);
  });
});
