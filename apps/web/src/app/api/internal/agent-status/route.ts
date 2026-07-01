import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

// Local ops tool: powers the Matrix-vibe agent dashboard at /agents.html. It reads
// the experience-loop's own artifacts (status heartbeat, LOG.md, ticket queue) from
// the repo working tree. This is meant for watching the LOCAL loop during development;
// on a serverless deploy the .agents/ files may be absent, in which case it returns a
// calm "no data" payload rather than erroring.
export const dynamic = "force-dynamic";

const AGENT_NAMES = ["Orchestrator", "Planner", "Builder", "Tester", "UserSimulator"] as const;

/** Walk up from the cwd to find the repo root that contains `.agents/experience-loop`. */
async function findLoopDir(): Promise<string | null> {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, ".agents", "experience-loop");
    try {
      await stat(candidate);
      return candidate;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

async function readStatus(loopDir: string) {
  try {
    const raw = await readFile(path.join(loopDir, "status.json"), "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function readLogTail(loopDir: string, lines: number): Promise<string[]> {
  try {
    const raw = await readFile(path.join(loopDir, "LOG.md"), "utf8");
    return raw
      .split(/\r?\n/)
      .filter((l) => l.trim().startsWith("- "))
      .slice(-lines)
      .map((l) => l.replace(/^- /, ""));
  } catch {
    return [];
  }
}

async function countTickets(loopDir: string) {
  const ticketsDir = path.resolve(loopDir, "..", "customer-feedback", "tickets");
  const counts: Record<string, number> = { ready: 0, "in-progress": 0, implemented: 0, verified: 0, "blocked-owner": 0, draft: 0, archived: 0, active: 0 };
  async function scan(dir: string, archived: boolean) {
    let entries: string[] = [];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (!/^CX-.*\.md$/.test(name)) continue;
      if (archived) {
        counts.archived += 1;
        continue;
      }
      counts.active += 1;
      try {
        const body = await readFile(path.join(dir, name), "utf8");
        const m = body.match(/^- Status:\s*`([^`]+)`/m);
        const s = (m?.[1] ?? "").trim();
        if (s in counts) counts[s] += 1;
      } catch {
        /* ignore */
      }
    }
  }
  await scan(ticketsDir, false);
  await scan(path.join(ticketsDir, "archive"), true);
  return counts;
}

/** Infer a per-agent view from the status heartbeat, falling back to LOG.md phase parsing. */
function deriveAgents(status: Record<string, unknown> | null, log: string[]) {
  const fromStatus = (status?.agents ?? null) as Record<string, { state?: string; ticket?: string | null; since?: string | null }> | null;
  const lastByPhase: Record<string, string> = {};
  for (const line of log) {
    const phase = line.split("|")[1]?.trim();
    if (phase) lastByPhase[phase] = line;
  }
  const phaseToAgent: Record<string, string> = { plan: "Planner", build: "Builder", test: "Tester", "user-sim": "UserSimulator" };
  return AGENT_NAMES.map((name) => {
    const s = fromStatus?.[name];
    const phaseKey = Object.keys(phaseToAgent).find((k) => phaseToAgent[k] === name);
    const lastLine = phaseKey ? lastByPhase[phaseKey] : undefined;
    return {
      name,
      state: (s?.state as string) ?? "idle",
      ticket: s?.ticket ?? null,
      since: s?.since ?? null,
      lastAction: lastLine ?? null,
    };
  });
}

export async function GET() {
  const loopDir = await findLoopDir();
  if (!loopDir) {
    return NextResponse.json({ available: false, reason: "loop-dir-not-found", agents: [], log: [], tickets: {}, loop: "unknown" });
  }
  const [status, log, tickets] = await Promise.all([readStatus(loopDir), readLogTail(loopDir, 40), countTickets(loopDir)]);
  return NextResponse.json({
    available: true,
    loop: (status?.loop as string) ?? "running",
    phase: (status?.phase as string) ?? null,
    updatedAt: (status?.updatedAt as string) ?? null,
    agents: deriveAgents(status, log),
    tickets,
    log: log.slice(-24).reverse(),
  });
}
