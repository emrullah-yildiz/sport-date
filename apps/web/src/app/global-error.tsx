"use client";

// App Router global error boundary. Reports the error to Sentry (a no-op when
// no DSN is configured) and renders a minimal fallback. Errors are scrubbed by
// the client `beforeSend` before any event is sent.
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
