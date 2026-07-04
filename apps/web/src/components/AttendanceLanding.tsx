import Link from "next/link";

import AttendanceActionPanel from "@/components/AttendanceActionPanel";
import { BRAND_NAME, SUPPORT_EMAIL, Wordmark } from "@/lib/brand";
import { getAttendanceTokenView } from "@/lib/attendance-confirmations";

// Shared server component for the public, no-login attendance confirm/cancel
// landing pages (CX-20260704). Validates the token READ-ONLY (never mutates on
// GET, so an email scanner's prefetch can't confirm/cancel anything), shows the
// event's approximate-only summary, and hands the mutation to the progressive
// AttendanceActionPanel. Approximate area only — the exact venue is never shown.

type Result = "confirmed" | "cancelled" | "expired" | "invalid" | "already-cancelled" | "error" | null;

function formatWhen(startsAt: string, timeZone: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
  }).format(date);
}

export default async function AttendanceLanding({
  action,
  eventId,
  token,
  stateParam,
}: {
  action: "confirm" | "cancel";
  eventId: string;
  token: string;
  stateParam: string | null;
}) {
  const view = token ? await getAttendanceTokenView(eventId, token, new Date()) : null;
  const initialResult = (stateParam && ["confirmed", "cancelled", "expired", "invalid", "already-cancelled"].includes(stateParam)
    ? stateParam
    : null) as Result;

  const title = action === "confirm" ? "Confirm you're coming" : "Can't make it?";

  return (
    <main className="attendance-page">
      <header className="navbar">
        <div className="nav-container">
          <Link className="logo" href="/" aria-label={`${BRAND_NAME} home`}>
            <Wordmark decorative />
          </Link>
          <span className="research-flag">Attendance</span>
        </div>
      </header>

      <div className="landing-shell attendance-shell">
        <section className="attendance-card">
          <p className="eyebrow">{action === "confirm" ? "Still coming?" : "Free up your place"}</p>
          <h1>{title}</h1>

          {view ? (
            <>
              <dl className="attendance-facts">
                <div><dt>Activity</dt><dd>{view.summary.sport}</dd></div>
                <div><dt>When</dt><dd>{formatWhen(view.summary.startsAt, view.summary.timeZone)}</dd></div>
                <div><dt>Approximate area</dt><dd>{view.summary.areaLabel}{view.summary.city && view.summary.city.toLowerCase() !== view.summary.areaLabel.toLowerCase() ? `, ${view.summary.city}` : ""}</dd></div>
              </dl>
              <p className="attendance-privacy">
                The exact meeting point stays in the app — this page shows only the approximate area.
              </p>
              <AttendanceActionPanel
                eventId={eventId}
                token={token}
                action={action}
                expired={view.expired}
                initialResult={initialResult}
              />
              <p className="attendance-alt">
                {action === "confirm" ? (
                  <Link href={`/e/${eventId}/cancel?t=${encodeURIComponent(token)}`}>Actually, I can&rsquo;t make it</Link>
                ) : (
                  <Link href={`/e/${eventId}/confirm?t=${encodeURIComponent(token)}`}>Actually, I can come</Link>
                )}
              </p>
            </>
          ) : (
            <p className="attendance-result" role="status">
              This attendance link isn&rsquo;t valid or has expired. If you think it should work, contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
