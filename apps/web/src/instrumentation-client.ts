// Sentry initialisation for the browser/client runtime.
//
// Env-gated: with no NEXT_PUBLIC_SENTRY_DSN in the client bundle (the current
// production state), `Sentry.init` is a no-op and the page behaves exactly as
// today. Privacy-first: Session Replay is OFF (no Replay integration, both
// replay sample rates 0), no default PII, and a beforeSend that scrubs
// bodies/headers/query/email/IP before any event is sent from the browser.
import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "./lib/sentry-scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  sendDefaultPii: false,
  tracesSampleRate: 0.1,

  // Session Replay is OFF — a dating product must not record member sessions.
  // No replayIntegration() is added; these rates are belt-and-braces.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  beforeSend: (event) => scrubEvent(event),
});

// Instrument App Router client-side navigation transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
