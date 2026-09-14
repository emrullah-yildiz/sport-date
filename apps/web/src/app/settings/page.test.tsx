import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ user: vi.fn(), preferences: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/communication-preferences", () => ({ getCommunicationPreferences: mocks.preferences }));
vi.mock("@/lib/stripe", () => ({ isBillingConfigured: () => false }));
vi.mock("@/lib/entitlements", () => ({ isPlus: () => false }));
vi.mock("@/lib/email-provider", () => ({ resolveTransactionalEmailProvider: () => "disabled" }));
vi.mock("next/navigation", () => ({ redirect: () => { throw Error("login required"); }, useRouter: () => ({ refresh: vi.fn() }) }));
import Page from "./page";
beforeEach(() => { vi.clearAllMocks(); });
it("authenticates before reading account preferences", async () => {
  mocks.user.mockResolvedValue(null);
  await expect(Page()).rejects.toThrow("login required");
  expect(mocks.preferences).not.toHaveBeenCalled();
});
it("loads only the signed-in account and retains data and session controls", async () => {
  mocks.user.mockResolvedValue({ id: "synthetic-member", firstName: "Alex", email: "member@example.invalid", emailVerified: true });
  mocks.preferences.mockResolvedValue({ productUpdatesOptIn: false, consentHistory: [], productUpdatesUpdatedAt: null });
  const html = renderToStaticMarkup(await Page());
  expect(mocks.preferences).toHaveBeenCalledWith("synthetic-member");
  expect(html).toContain('id="account-security"');
  expect(html).toContain("Devices &amp; sessions");
  expect(html).toContain("Your data &amp; account deletion");
});
