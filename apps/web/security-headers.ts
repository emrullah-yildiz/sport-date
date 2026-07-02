type Header = { key: string; value: string };

function buildContentSecurityPolicy(nodeEnv: string): string {
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (nodeEnv !== "production") scriptSrc.push("'unsafe-eval'");

  // Allow the browser Sentry SDK to send error/trace events to the EU ingest
  // endpoint (otherwise CSP blocks it and client-side monitoring is silently
  // broken, throwing console errors on every page).
  const connectSrc = ["'self'", "https://*.ingest.de.sentry.io"];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
  ].join("; ");
}

export function buildSecurityHeaders(nodeEnv: string): Header[] {
  const headers: Header[] = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(nodeEnv) },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(self), microphone=(), payment=(), usb=()",
    },
  ];

  if (nodeEnv === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
