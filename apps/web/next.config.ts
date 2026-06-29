import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
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

// Wrap with the Sentry build plugin. Everything is gated so the CURRENT deploy
// (no DSN, no auth token, no org/project) builds and behaves exactly as before:
//   - `silent: true` suppresses build-time Sentry output.
//   - org/project come from env; absent now, so no upload is even attempted.
//   - Source-map upload is enabled ONLY when SENTRY_AUTH_TOKEN is present.
//     Without the token the plugin skips upload — no error, no behaviour change.
//   - telemetry is disabled.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: sentryAuthToken,

  silent: true,
  telemetry: false,

  // Upload a wider set of client files for better stack-trace resolution.
  widenClientFileUpload: true,

  // Only have the plugin produce/upload source maps when we actually have a
  // token to upload them with; otherwise leave the build untouched.
  sourcemaps: {
    disable: !sentryAuthToken,
  },
});
