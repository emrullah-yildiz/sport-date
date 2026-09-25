import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("PREVIEW_UNAVAILABLE"); } }));
vi.mock("@/components/website-preview/WebsitePreview", () => ({ default: () => null }));
import PreviewPage from "./page";
afterEach(() => vi.unstubAllEnvs());
describe("full website preview boundary", () => {
  it("renders only in development", () => { vi.stubEnv("NODE_ENV", "development"); expect(PreviewPage()).toBeTruthy(); });
  it("is unavailable in production", () => { vi.stubEnv("NODE_ENV", "production"); expect(() => PreviewPage()).toThrow("PREVIEW_UNAVAILABLE"); });
});
