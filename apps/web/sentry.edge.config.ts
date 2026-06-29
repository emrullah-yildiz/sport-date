// Sentry initialisation for the Edge runtime (middleware / edge route handlers).
//
// Env-gated and PII-scrubbed exactly like the Node server config: no DSN means
// `Sentry.init` is a no-op and runtime behaviour is unchanged.
import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "./src/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  sendDefaultPii: false,
  tracesSampleRate: 0.1,

  beforeSend: (event) => scrubEvent(event),
});
