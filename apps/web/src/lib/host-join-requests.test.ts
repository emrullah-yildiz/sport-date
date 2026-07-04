import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));

let getHostJoinRequests: typeof import("./events").getHostJoinRequests;
let getDatabase: typeof import("./db").getDatabase;

beforeAll(async () => {
  ({ getHostJoinRequests } = await import("./events"));
  ({ getDatabase } = await import("./db"));
});

describe("host join-request queue", () => {
  it("keeps a valid request visible when the requester has not listed the event sport", async () => {
    const sql = vi.fn().mockResolvedValue([{
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      status: "pending",
      skip_count: 0,
      introduction: "I would enjoy joining.",
      requested_at: "2026-07-04T10:00:00.000Z",
      requester_user_id: "22222222-2222-4222-8222-222222222222",
      first_name: "Mara",
      age: 29,
      bio: "New to this sport.",
      languages: ["English"],
      skill_level: "not listed",
    }]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const requests = await getHostJoinRequests(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "11111111-1111-4111-8111-111111111111",
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ status: "pending", requester: { firstName: "Mara", skillLevel: "not listed" } });
    const query = (sql.mock.calls[0][0] as TemplateStringsArray).join("?");
    expect(query).toContain("LEFT JOIN user_sports AS sport");
    expect(query).toContain("events.host_user_id = ?");
  });
});
