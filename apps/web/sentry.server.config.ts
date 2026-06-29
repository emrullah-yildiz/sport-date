// Sentry initialisation for the Node.js server runtime.
//
// Env-gated: with no NEXT_PUBLIC_SENTRY_DSN set (the current production state),
// `Sentry.init` receives `dsn: undefined` and is a no-op — the app behaves
// exactly as it does today. Privacy-first defaults: no PII, no session replay,
// low trace sampling, and a beforeSend that scrubs bodies/headers/query/email/IP.
import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "./src/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // Never send IPs, request headers, or other default PII.
  sendDefaultPii: false,

  // Low trace sampling; this is error monitoring, not a tracing product.
  tracesSampleRate: 0.1,

  // Do not attach local variable values to stack frames — they can hold PII.
  includeLocalVariables: false,

  // Final privacy gate: strip bodies, Cookie/Authorization headers, query
  // strings, and any email/IP before the event leaves the process.
  beforeSend: (event) => scrubEvent(event),
});
