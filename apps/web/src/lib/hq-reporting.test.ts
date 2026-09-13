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
});

