import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../../public/hq.html", import.meta.url), "utf8");
const script = html.slice(html.indexOf("(function(){", html.indexOf("// HQ_STANDUP_RUNTIME")), html.lastIndexOf("</script>"));
const report = (generatedAt = new Date().toISOString()) => ({
  day: generatedAt.slice(0, 10), generatedAt, headline: "Verified work", summary: ["Evidence"], agents: [],
  directions: [{ id: "SD-20260914-launch", priority: "high", title: "Launch", detail: "Review", recommendation: "Approve scope" }],
});
async function render(api: unknown, snapshot: unknown, decisionStatus = 200, decisions: unknown[] = [], stalledApi = false) {
  const box = { innerHTML: "", querySelectorAll: () => [] };
  const day = { textContent: "" };
  runInNewContext(script, {
    AbortSignal,
    document: { getElementById: (id: string) => id === "standup" ? box : day },
    fetch: async (url: string) => stalledApi && url.endsWith("report") ? new Promise(() => {}) : ({
      ok: url.endsWith("directions") ? decisionStatus === 200 : Boolean(url.endsWith("latest.json") ? snapshot : api),
      status: url.endsWith("directions") ? decisionStatus : 200,
      json: async () => url.endsWith("directions") ? { decisions } : url.endsWith("latest.json") ? snapshot : { report: api },
    }),
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { box, day };
}
describe("HQ trustworthy owner reporting", () => {
  it("shows the valid snapshot promptly when the API stalls, without enabling unknown decisions", async () => {
    const { box } = await render(null, report(), 200, [], true);
    expect(box.innerHTML).toContain("Verified work");
    expect(box.innerHTML).toContain("repository snapshot (checking other source)");
    expect(box.innerHTML).toContain('data-act="approve" disabled');
  });
  it("shows the newest source, including a newer snapshot than the API", async () => {
    const { box } = await render(report("2026-07-14T01:20:00Z"), report());
    expect(box.innerHTML).toContain("Source: repository snapshot");
    expect(box.innerHTML).toContain("Recent report");
    expect(box.innerHTML).toContain("1 awaiting your response");
  });
  it("labels old reports stale instead of implying active workers", async () => {
    const { box } = await render(report("2026-07-14T01:20:00Z"), null);
    expect(box.innerHTML).toContain("STALE");
    expect(box.innerHTML).toContain("other source unavailable");
  });
  it("does not treat inaccessible decisions as pending or enable writes", async () => {
    const { box } = await render(report(), null, 403);
    expect(box.innerHTML).toContain("Sign in as the owner");
    expect(box.innerHTML).not.toContain("1 awaiting");
    expect(box.innerHTML).toContain('data-act="approve" disabled');
  });
  it("preserves saved decisions and distinguishes approval from execution", async () => {
    const { box } = await render(report(), null, 200, [{ directionId: "SD-20260914-launch", action: "approve", comment: "Budget capped" }]);
    expect(box.innerHTML).toContain("0 awaiting your response");
    expect(box.innerHTML).toContain("Budget capped");
    expect(box.innerHTML).toContain("Approval is not execution");
  });
  it("fails honestly when reports cannot be loaded", async () => {
    const { box, day } = await render(null, null);
    expect(day.textContent).toBe("unavailable");
    expect(box.innerHTML).toContain("no scheduled delivery is promised");
  });
  it("escapes report and decision text", async () => {
    const unsafe = report();
    unsafe.headline = '<script>alert("bad")</script>';
    const { box } = await render(unsafe, null);
    expect(box.innerHTML).toContain("&lt;script&gt;");
    expect(box.innerHTML).not.toContain("<script>");
  });
  it("puts named assignments before the long report and labels legacy status as team review", async () => {
    const assigned = { ...report(), agents: [{ name: "UX reviewer", status: "keep", metric: "Review host edit recovery", note: "Assigned at 2026-09-14T00:00:00Z; verification pending." }] };
    const { box } = await render(assigned, null);
    expect(box.innerHTML).toContain("Who is working on what");
    expect(box.innerHTML).toContain("Task / outcome</dt><dd>Review host edit recovery");
    expect(box.innerHTML).toContain("Reported update</dt><dd>Assigned at");
    expect(box.innerHTML).toContain("Team review: keep");
    expect(box.innerHTML).toContain("not a live heartbeat");
    expect(box.innerHTML.indexOf("UX reviewer")).toBeLessThan(box.innerHTML.indexOf("Work report"));
    expect(box.innerHTML).not.toContain("Agent scorecard");
    expect(box.innerHTML).not.toContain('class="sd-tag keep"');
  });
  it("does not invent workers when assignments are absent", async () => {
    const { box } = await render(report(), null);
    expect(box.innerHTML).toContain("Current assignments are unknown");
    expect(box.innerHTML).not.toContain('<article class="assignment-card">');
  });
  it("keeps historical assignment timestamps and stale warnings visible", async () => {
    const old = { ...report("2026-07-14T01:20:00Z"), agents: [{ name: "Builder", status: "probation", metric: "Earlier task", note: "Earlier update" }] };
    const { box } = await render(old, null);
    expect(box.innerHTML).toContain("STALE");
    expect(box.innerHTML).toContain('datetime="2026-07-14T01:20:00Z"');
    expect(box.innerHTML).toContain("Team review: probation");
    expect(box.innerHTML).toContain("Last reported assignments");
  });
  it("escapes every assignment field without turning status into an HTML attribute", async () => {
    const unsafe = '<img src=x onerror="alert(1)">';
    const { box } = await render({ ...report(), agents: [{ name: unsafe, status: unsafe, metric: unsafe, note: unsafe }] }, null);
    expect(box.innerHTML.match(/&lt;img/g)).toHaveLength(4);
    expect(box.innerHTML).not.toContain("<img");
  });
  it("preserves an unsaved owner note when saved decisions finish loading", async () => {
    let onInput = () => {};
    let finishDecisions!: (value: unknown) => void;
    const pendingDecisions = new Promise((resolve) => { finishDecisions = resolve; });
    const note = { value: "", addEventListener: (_event: string, callback: () => void) => { onInput = callback; } };
    const card = {
      getAttribute: () => "SD-20260914-launch",
      querySelector: (selector: string) => selector === ".sd-comment" ? note : null,
      querySelectorAll: () => [],
    };
    const box = { innerHTML: "", querySelectorAll: () => [card] };
    runInNewContext(script, {
      AbortSignal,
      document: { getElementById: (id: string) => id === "standup" ? box : { textContent: "" } },
      fetch: async (url: string) => ({ ok: true, status: 200, json: async () => url.endsWith("directions") ? pendingDecisions : url.endsWith("latest.json") ? report() : { report: report() } }),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    note.value = 'Keep my draft <please>';
    onInput();
    finishDecisions({ decisions: [] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(box.innerHTML).toContain("Keep my draft &lt;please&gt;</textarea>");
    expect(box.innerHTML).toContain("1 awaiting your response");
  });
});

