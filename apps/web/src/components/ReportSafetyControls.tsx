"use client";

import { SAFETY_REPORT_CATEGORIES, type SafetyReportCategory } from "@sport-date/domain";
import { useRef, useState } from "react";

import { cancelJoinRequest } from "@/lib/cancel-join-request";

// A third-party event the blocker and the blocked member are both still in. Shape
// mirrors the API's `sharedUpcomingEvents`; only the blocker's OWN request id is
// present, so leaving needs no extra lookup and reveals nothing new.
type SharedUpcomingEvent = {
  eventId: string;
  requestId: string;
  sport: string;
  title: string;
  startsAt: string;
  timeZone: string;
};

function formatEventWhen(startsAt: string, timeZone: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
  }).format(date);
}

const categoryLabels: Record<SafetyReportCategory, string> = {
  harassment: "Harassment", hate: "Hate or discrimination", sexual_misconduct: "Sexual misconduct",
  sexual_intent: "Sexual or inappropriate intent (e.g. a hookup-oriented event)",
  violence_threat: "Violence or threat", stalking: "Stalking or unwanted following", scam: "Scam",
  impersonation: "Impersonation", suspected_underage: "Suspected underage member",
  unsafe_event: "Unsafe event or location", no_show: "No-show", other: "Something else",
};

// Calm, factual confirmation for the irreversible standalone block. States plainly
// what the block now prevents and where to manage it — no alarm, no dark pattern,
// and no data about the blocked member beyond the name already shown on this control.
export function blockConfirmationMessage(name: string): string {
  return `You blocked ${name}. They can no longer see your requests, places, room, or approximate location. You can manage blocks anytime from your profile.`;
}

export default function ReportSafetyControls({ eventId, subjectUserId, subjectName }: { eventId: string; subjectUserId: string; subjectName: string }) {
  const [category, setCategory] = useState<SafetyReportCategory>("harassment");
  const [details, setDetails] = useState("");
  const [blockUser, setBlockUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Latches once the standalone block succeeds so the irreversible quick action
  // reads as done and cannot be re-fired; the confirmation stays put (no redirect)
  // so keyboard/screen-reader members actually perceive the announced closure.
  const [blocked, setBlocked] = useState(false);
  // Upcoming third-party events the two are still both in after the block, plus the
  // set already left, so the member can leave in one tap — but is never forced out.
  const [sharedEvents, setSharedEvents] = useState<SharedUpcomingEvent[]>([]);
  const [leftEventIds, setLeftEventIds] = useState<string[]>([]);
  const [leavingEventId, setLeavingEventId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  // Success and failure are separate persistent live regions (mirrors the shipped
  // RoomLeaveControl / EditProfileForm pattern): the containers are always mounted
  // and empty before submit, so a content change is announced — a failed *safety*
  // report is assertive so it is not queued behind whatever the reader is saying.
  const [tone, setTone] = useState<"success" | "error">("success");
  // Moves keyboard/screen-reader focus to the confirmation on a successful report
  // that stays on this page (no block redirect), so an already-sent report is not
  // silently re-submitted from the still-editable form.
  const confirmRef = useRef<HTMLParagraphElement>(null);

  function announce(text: string, nextTone: "success" | "error", focusConfirm = false) {
    setTone(nextTone);
    setMessage(text);
    if (focusConfirm) requestAnimationFrame(() => confirmRef.current?.focus());
  }

  async function report(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/safety/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, reportedUserId: subjectUserId, category, details, blockUser }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Report failed.");
      setDetails("");
      const shared: SharedUpcomingEvent[] = blockUser && Array.isArray(result.sharedUpcomingEvents) ? result.sharedUpcomingEvents : [];
      setSharedEvents(shared);
      // Block-and-report normally redirects to /profile. But if the block left the
      // two scheduled into the same third-party event(s), stay here so the member
      // can see the warning and choose whether to leave — never yanked away mid-decision.
      const stayForSharedWarning = blockUser && shared.length > 0;
      announce(result.message, "success", !blockUser || stayForSharedWarning);
      if (blockUser && !stayForSharedWarning) setTimeout(() => window.location.assign("/profile"), 1200);
    } catch (error) { announce(error instanceof Error ? error.message : "Report failed.", "error"); }
    finally { setSubmitting(false); }
  }

  async function blockOnly() {
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/safety/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockedUserId: subjectUserId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Block failed.");
      // Irreversible safety action: don't hard-navigate away with no acknowledgement.
      // Latch the done state and announce a calm, factual confirmation in place, moving
      // focus to it (as the no-block report path does) so keyboard/SR users get closure —
      // consistent with the report+block path, which also surfaces a message on success.
      setBlocked(true);
      setSharedEvents(Array.isArray(result.sharedUpcomingEvents) ? result.sharedUpcomingEvents : []);
      announce(blockConfirmationMessage(subjectName), "success", true);
    } catch (error) { announce(error instanceof Error ? error.message : "Block failed.", "error"); }
    finally { setSubmitting(false); }
  }

  // One-tap leave for a still-shared third-party event. Leaving is optional — the
  // member is warned, never forced out. The exit is recorded as a safety exit so it
  // never counts toward the reliability signal (protecting themselves is free).
  async function leaveSharedEvent(shared: SharedUpcomingEvent) {
    setLeavingEventId(shared.eventId);
    try {
      const result = await cancelJoinRequest(shared.eventId, shared.requestId, { exit: { reason: "felt_unsafe" } });
      if (!result.ok) { announce(result.message, "error"); return; }
      setLeftEventIds((prev) => (prev.includes(shared.eventId) ? prev : [...prev, shared.eventId]));
      announce(`You left ${shared.sport} on ${formatEventWhen(shared.startsAt, shared.timeZone)}. You and ${subjectName} are no longer scheduled together for it.`, "success");
    } finally { setLeavingEventId(null); }
  }

  return (
    <details className="safety-controls">
      <summary>Safety options for {subjectName}</summary>
      <div className="safety-quick-action"><p>Blocking immediately removes shared requests, places, room access, and exact-location access. It does not restore anything if later undone.</p><button type="button" onClick={blockOnly} disabled={submitting || blocked} aria-busy={submitting}>{blocked ? `Blocked ${subjectName}` : submitting ? "Blocking…" : `Block ${subjectName}`}</button></div>
      <form onSubmit={report}>
        <label>What happened?<select value={category} onChange={(event) => setCategory(event.target.value as SafetyReportCategory)}>{SAFETY_REPORT_CATEGORIES.map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}</select></label>
        <label>Describe what happened<textarea minLength={20} maxLength={2000} required rows={4} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Include what happened, when, and anything the safety team should preserve." /></label>
        <label className="report-block-choice"><input type="checkbox" checked={blockUser} onChange={(event) => setBlockUser(event.target.checked)} />Also block this member immediately</label>
        <button type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? "Recording…" : "Submit safety report"}</button>
      </form>
      {sharedEvents.length > 0 ? (
        <div className="safety-shared-events" role="note" aria-label={`You and ${subjectName} are both still signed up for the same upcoming ${sharedEvents.length === 1 ? "event" : "events"}`}>
          <strong>You&apos;re both still signed up for the same upcoming {sharedEvents.length === 1 ? "event" : "events"}.</strong>
          <p>
            Blocking hides {subjectName} from you online, but it can&apos;t remove either of you from an event someone
            else is hosting — so you&apos;d still be there in person together. You don&apos;t have to leave, and no one is
            told if you do. The choice is entirely yours.
          </p>
          <ul className="safety-shared-list">
            {sharedEvents.map((shared) => (
              <li key={shared.eventId} className="safety-shared-item">
                <span className="safety-shared-when">{shared.sport} · {formatEventWhen(shared.startsAt, shared.timeZone)}</span>
                {leftEventIds.includes(shared.eventId) ? (
                  <span className="safety-shared-left">You left this event</span>
                ) : (
                  <button
                    type="button"
                    className="safety-shared-leave"
                    onClick={() => leaveSharedEvent(shared)}
                    disabled={leavingEventId === shared.eventId}
                    aria-busy={leavingEventId === shared.eventId}
                  >
                    {leavingEventId === shared.eventId ? "Leaving…" : "Leave this event"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="safety-emergency">If anyone is in immediate danger, move somewhere safe and contact local emergency services.</p>
      <div className="safety-message-region" role="status" aria-live="polite">
        {message && tone === "success" ? <p className="safety-message" ref={confirmRef} tabIndex={-1}>{message}</p> : null}
      </div>
      <div className="safety-message-region" role="alert" aria-live="assertive">
        {message && tone === "error" ? <p className="safety-message safety-message-error">{message}</p> : null}
      </div>
    </details>
  );
}

