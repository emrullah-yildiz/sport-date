"use client";

import { EVENT_ATTENDANCE_OUTCOMES, WOULD_JOIN_AGAIN_OPTIONS } from "@sport-date/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Reflection = {
  attendance: (typeof EVENT_ATTENDANCE_OUTCOMES)[number];
  wouldJoinAgain: (typeof WOULD_JOIN_AGAIN_OPTIONS)[number];
};

export default function EventReflectionForm({ eventId, reflection }: { eventId: string; reflection: Reflection | null }) {
  const router = useRouter();
  const [attendance, setAttendance] = useState<Reflection["attendance"]>(reflection?.attendance ?? "attended");
  const [wouldJoinAgain, setWouldJoinAgain] = useState<Reflection["wouldJoinAgain"]>(reflection?.wouldJoinAgain ?? "prefer_not_to_say");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function saveReflection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/events/${eventId}/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance, wouldJoinAgain }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Reflection could not be saved.");
      setMessage(result.qualifiedForProgress
        ? "Move recorded. Your private Movement Arc has advanced."
        : "Reflection saved. This does not advance your Movement Arc, and no penalty or public score is applied.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reflection could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="event-reflection" aria-labelledby="event-reflection-title">
      <div>
        <p className="panel-label">After the movement</p>
        <h2 id="event-reflection-title">What actually happened?</h2>
        <p>This private reflection improves the product and your personal Movement Arc. It is never a public rating of another person.</p>
      </div>
      <form onSubmit={saveReflection}>
        <label>My attendance
          <select value={attendance} onChange={(event) => setAttendance(event.target.value as Reflection["attendance"])}>
            <option value="attended">I attended</option>
            <option value="left_early">I left early</option>
            <option value="did_not_attend">I did not attend</option>
          </select>
        </label>
        <label>Would I join this group again?
          <select value={wouldJoinAgain} onChange={(event) => setWouldJoinAgain(event.target.value as Reflection["wouldJoinAgain"])}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>
        <button type="submit" disabled={submitting}>{submitting ? "Saving..." : reflection ? "Update private reflection" : "Save private reflection"}</button>
        {message ? <p role="status">{message}</p> : null}
      </form>
      <small>Leaving early or not attending creates no penalty. If something felt unsafe, use the report controls above; reflection is not a safety report.</small>
    </section>
  );
}
