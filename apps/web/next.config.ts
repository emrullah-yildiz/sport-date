import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./security-headers";

const nextConfig: NextConfig = {
  // `@sport-date/domain` is consumed as raw TypeScript from the workspace
  // (its package `exports` points at `./src/index.ts`), so Next must transpile
  // it. Declaring it explicitly keeps the monorepo build deterministic across
  // local and Vercel (Root Directory = apps/web) builds.
  transpilePackages: ["@sport-date/domain"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(process.env.NODE_ENV ?? "development"),
      },
    ];
  },
};

export default nextConfig;
