"use client";

import type { ExperienceLevel } from "@sport-date/domain";
import { useState } from "react";

const levels: Array<{ value: ExperienceLevel; label: string }> = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function CreateEventForm() {
  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>(["beginner", "intermediate"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleLevel(level: ExperienceLevel) {
    setExperienceLevels((current) => current.includes(level) ? current.filter((item) => item !== level) : [...current, level]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const localStart = String(form.get("startsAt"));
      const startsAt = new Date(localStart);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (Number.isNaN(startsAt.getTime())) throw new Error("Choose a valid start time.");
      const payload = {
        sport: form.get("sport"), title: form.get("title"), description: form.get("description"),
        startsAt: startsAt.toISOString(), timeZone, durationMinutes: form.get("durationMinutes"),
        capacity: form.get("capacity"), language: form.get("language"), experienceLevels,
        participantAgeRange: { minimum: form.get("minimumAge"), maximum: form.get("maximumAge") },
        location: {
          public: { city: form.get("city"), countryCode: form.get("countryCode"), areaLabel: form.get("areaLabel"), approximateLatitude: null, approximateLongitude: null },
          private: { venueName: form.get("venueName"), address: form.get("address"), instructions: form.get("instructions"), latitude: null, longitude: null },
        },
      };
      const response = await fetch("/api/events", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Event creation failed.");
      window.location.assign(`/events/${result.eventId}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Event creation failed.");
      setSubmitting(false);
    }
  }

  return (
    <form className="event-form" onSubmit={submit}>
      <section className="event-form-section">
        <p className="panel-label">The invitation</p>
        <h2>Give people a reason to picture themselves there.</h2>
        <div className="event-field-grid"><label>Sport<input name="sport" required maxLength={60} placeholder="Tennis" /></label><label>Event name<input name="title" required maxLength={100} placeholder="An easy evening rally" /></label></div>
        <label>Description<textarea name="description" required minLength={20} maxLength={1000} rows={5} placeholder="Set the pace, mood, and what a newcomer should expect." /></label>
      </section>

      <section className="event-form-section">
        <p className="panel-label">The rhythm</p>
        <h2>Make the commitment easy to understand.</h2>
        <div className="event-field-grid"><label>Starts at<input name="startsAt" type="datetime-local" required /></label><label>Duration in minutes<input name="durationMinutes" type="number" min="15" max="480" defaultValue="90" required /></label><label>Total places<input name="capacity" type="number" min="2" max="20" defaultValue="4" required /></label><label>Event language<input name="language" maxLength={35} placeholder="English" required /></label></div>
        <p className="field-help">The event time zone is captured from your device when you publish.</p>
        <fieldset><legend>Experience levels welcome</legend><div className="choice-row">{levels.map((level) => <label className="choice-pill" key={level.value}><input type="checkbox" checked={experienceLevels.includes(level.value)} onChange={() => toggleLevel(level.value)} />{level.label}</label>)}</div></fieldset>
        <div className="event-field-grid"><label>Minimum age<input name="minimumAge" type="number" min="18" max="100" defaultValue="24" required /></label><label>Maximum age<input name="maximumAge" type="number" min="18" max="100" defaultValue="38" required /></label></div>
      </section>

      <section className="event-form-section location-separation">
        <div className="location-column public-location"><p className="panel-label">Discovery sees</p><h2>An approximate area</h2><p>Enough context to judge the journey. Never the door they should walk through.</p><label>City<input name="city" required maxLength={100} /></label><label>Country code<input name="countryCode" required minLength={2} maxLength={2} placeholder="RO" /></label><label>Area or neighborhood<input name="areaLabel" required maxLength={120} placeholder="Tineretului" /></label></div>
        <div className="location-column private-location"><p className="panel-label">Accepted people see</p><h2>The precise meeting point</h2><p>Stored separately and revealed only after acceptance.</p><label>Venue name<input name="venueName" required maxLength={120} placeholder="Court 2" /></label><label>Exact address<input name="address" required maxLength={300} /></label><label>Arrival instructions<textarea name="instructions" maxLength={500} rows={3} placeholder="Where to enter, who to ask for, and what to bring." /></label></div>
      </section>

      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <button className="event-publish" type="submit" disabled={submitting || experienceLevels.length === 0}>{submitting ? "Publishing…" : "Publish the invitation"}</button>
      <p className="event-form-note">Publishing makes only the approximate event details discoverable. Exact meeting details remain private.</p>
    </form>
  );
}
