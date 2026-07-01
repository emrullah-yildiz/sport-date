"use client";

// App Router *global* error boundary — the last-resort fallback for any error a
// nested `error.tsx` did not catch (a broadly-rendered server component throwing
// `DatabaseNotConfiguredError`, a missing-migration `column does not exist`, or
// any uncaught RSC render error). It REPLACES the root layout, so `globals.css`
// and the app chrome are NOT loaded here: every style below is inline so the
// calm fallback renders even when CSS/app chrome failed.
//
// It still reports the error to Sentry (a no-op when no DSN is configured);
// events are scrubbed by the shared `beforeSend` (see `src/lib/sentry-scrub.ts`)
// before any event is sent. NOTHING about the internal error — message, stack,
// `digest`, SQL, or column names — is shown to the member.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Brand palette, inlined (globals.css :root vars are unavailable in global-error).
const INK = "#17241d";
const CREAM = "#f4f0e7";
const LIME = "#c9f458";
const CORAL = "#ff765f";
const SAGE = "#667169";

/**
 * Presentational calm fallback. Pure and self-contained (no data fetching that
 * could throw again), so it can be render-tested without a DOM or the App Router
 * boundary props. `onRetry` is wired to the boundary's recovery prop by the
 * default export; when absent the "Try again" button simply reloads the page.
 */
export function GlobalErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <html lang="en">
      <head>
        <title>Sport Date — we&apos;re having a problem</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        {/* Focus + hover styling that survives even if app CSS never loaded, and
            respects prefers-reduced-motion (no transition when reduced). */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .sd-ge-retry { transition: transform .12s ease, background-color .12s ease; }
              .sd-ge-retry:hover { background-color: #d8ff7a; }
              .sd-ge-link:hover { text-decoration: underline; }
              .sd-ge-retry:focus-visible, .sd-ge-link:focus-visible {
                outline: 3px solid ${INK};
                outline-offset: 3px;
                border-radius: 12px;
              }
              @media (prefers-reduced-motion: reduce) {
                .sd-ge-retry { transition: none; }
              }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: CREAM,
          color: INK,
          fontFamily:
            '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          WebkitFontSmoothing: "antialiased",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Thin coral accent — the only coral on the page, used sparingly. */}
        <div aria-hidden="true" style={{ height: 4, backgroundColor: CORAL, width: "100%" }} />
        <main
          role="main"
          aria-labelledby="sd-ge-title"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "40px 20px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: "100%", maxWidth: 480 }}>
            <p
              style={{
                margin: 0,
                fontFamily:
                  '"Space Grotesk", "Inter", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "-0.01em",
                color: INK,
              }}
            >
              Sport Date
            </p>
            <div
              role="alert"
              style={{
                marginTop: 28,
                padding: "28px 24px",
                backgroundColor: "#ffffff",
                border: `1px solid rgba(23, 36, 29, 0.1)`,
                borderRadius: 18,
                boxShadow: "0 8px 30px rgba(23, 36, 29, 0.06)",
              }}
            >
              <h1
                id="sd-ge-title"
                tabIndex={-1}
                style={{
                  margin: 0,
                  fontFamily:
                    '"Space Grotesk", "Inter", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: 28,
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  color: INK,
                }}
              >
                Something went wrong on our end
              </h1>
              <p
                style={{
                  margin: "14px 0 0",
                  fontSize: 17,
                  lineHeight: 1.5,
                  color: INK,
                }}
              >
                Your account is safe. This is a problem on our side, not
                anything you did. Please try again in a moment.
              </p>
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  className="sd-ge-retry"
                  onClick={() => (onRetry ? onRetry() : window.location.reload())}
                  style={{
                    appearance: "none",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: LIME,
                    color: INK,
                    fontWeight: 600,
                    fontSize: 16,
                    minHeight: 44,
                    padding: "0 24px",
                    borderRadius: 999,
                    minWidth: 140,
                    fontFamily: "inherit",
                  }}
                >
                  Try again
                </button>
                <a
                  href="/login"
                  className="sd-ge-link"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 44,
                    padding: "0 20px",
                    borderRadius: 999,
                    border: `1px solid ${INK}`,
                    color: INK,
                    fontWeight: 600,
                    fontSize: 16,
                    textDecoration: "none",
                    boxSizing: "border-box",
                  }}
                >
                  Go to sign in
                </a>
              </div>
            </div>
            <p style={{ marginTop: 20, fontSize: 14, color: SAGE, lineHeight: 1.5 }}>
              If this keeps happening, please come back shortly — we&apos;re on it.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Report to Sentry (no-op without a DSN). The shared beforeSend scrubs PII
    // before send; nothing is shown to the member from `error`.
    Sentry.captureException(error);
  }, [error]);

  return <GlobalErrorFallback onRetry={() => unstable_retry()} />;
}
