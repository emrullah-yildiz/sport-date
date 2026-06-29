// Server-side instrumentation registration hook (Next.js App Router).
//
// `register()` loads the runtime-appropriate Sentry config. Both configs are
// env-gated, so with no NEXT_PUBLIC_SENTRY_DSN set this import runs `Sentry.init`
// as a no-op and changes nothing about runtime behaviour.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Capture unhandled server-side request errors (App Router). No-op without a DSN.
export const onRequestError = Sentry.captureRequestError;
