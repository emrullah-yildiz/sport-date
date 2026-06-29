"use client";

import type { ExperienceLevel } from "@sport-date/domain";
import { useState } from "react";

type HostEditableEvent = {
  id: string;
  sport: string;
  title: string;
  description: string;
  startsAt: string;
  timeZone: string;
  durationMinutes: number;
  capacity: number;
  language: string;
  minimumAge: number;
  maximumAge: number;
  experienceLevels: string[];
  publicLocation: { city: string; countryCode: string; areaLabel: string };
  privateLocation: { venueName: string; address: string; instructions: string | null };
};

const levels: Array<{ value: ExperienceLevel; label: string }> = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

function toLocalDateTimeInput(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function HostEditEventForm({ event }: { event: HostEditableEvent }) {
  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>(event.experienceLevels.filter((value): value is ExperienceLevel => value === "beginner" || value === "intermediate" || value === "advanced"));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function toggleLevel(level: ExperienceLevel) {
    setExperienceLevels((current) => current.includes(level) ? current.filter((item) => item !== level) : [...current, level]);
  }

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(formEvent.currentTarget);

    try {
      const localStart = String(form.get("startsAt"));
      const startsAt = new Date(localStart);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (Number.isNaN(startsAt.getTime())) throw new Error("Choose a valid start time.");

      const payload = {
        sport: form.get("sport"),
        title: form.get("title"),
        description: form.get("description"),
        startsAt: startsAt.toISOString(),
        timeZone,
        durationMinutes: form.get("durationMinutes"),
        capacity: form.get("capacity"),
        language: form.get("language"),
        experienceLevels,
        participantAgeRange: { minimum: form.get("minimumAge"), maximum: form.get("maximumAge") },
        location: {
          public: {
            city: form.get("city"),
            countryCode: form.get("countryCode"),
            areaLabel: form.get("areaLabel"),
            approximateLatitude: null,
            approximateLongitude: null,
          },
          private: {
            venueName: form.get("venueName"),
            address: form.get("address"),
            instructions: form.get("instructions"),
            latitude: null,
            longitude: null,
          },
        },
      };

      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Event update failed.");
      setMessage("Event updated. Accepted members keep access, but any changed details are now authoritative.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Event update failed.");
      setSubmitting(false);
    }
  }

  return (
    <details className="edit-profile host-edit-event">
      <summary>Edit this event</summary>
      <form onSubmit={submit}>
        <div className="edit-profile-row">
          <label>Sport<input name="sport" defaultValue={event.sport} required maxLength={60} /></label>
          <label>Event name<input name="title" defaultValue={event.title} required maxLength={100} /></label>
        </div>
        <label>Description<textarea name="description" defaultValue={event.description} required minLength={20} maxLength={1000} rows={4} /></label>
        <div className="edit-profile-row">
          <label>Starts at<input name="startsAt" type="datetime-local" defaultValue={toLocalDateTimeInput(event.startsAt)} required /></label>
          <label>Duration in minutes<input name="durationMinutes" type="number" min="15" max="480" defaultValue={event.durationMinutes} required /></label>
        </div>
        <div className="edit-profile-row">
          <label>Total places<input name="capacity" type="number" min="2" max="20" defaultValue={event.capacity} required /></label>
          <label>Event language<input name="language" defaultValue={event.language} required maxLength={35} /></label>
        </div>
        <fieldset>
          <legend>Experience levels welcome</legend>
          <div className="choice-row">
            {levels.map((level) => (
              <label className="choice-pill" key={level.value}>
                <input type="checkbox" checked={experienceLevels.includes(level.value)} onChange={() => toggleLevel(level.value)} />
                {level.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="edit-profile-row">
          <label>Minimum age<input name="minimumAge" type="number" min="18" max="100" defaultValue={event.minimumAge} required /></label>
          <label>Maximum age<input name="maximumAge" type="number" min="18" max="100" defaultValue={event.maximumAge} required /></label>
        </div>
        <div className="edit-profile-row">
          <label>City<input name="city" defaultValue={event.publicLocation.city} required maxLength={100} /></label>
          <label>Country code<input name="countryCode" defaultValue={event.publicLocation.countryCode} required minLength={2} maxLength={2} /></label>
        </div>
        <label>Area or neighborhood<input name="areaLabel" defaultValue={event.publicLocation.areaLabel} required maxLength={120} /></label>
        <div className="edit-profile-row">
          <label>Venue name<input name="venueName" defaultValue={event.privateLocation.venueName} required maxLength={120} /></label>
          <label>Exact address<input name="address" defaultValue={event.privateLocation.address} required maxLength={300} /></label>
        </div>
        <label>Arrival instructions<textarea name="instructions" defaultValue={event.privateLocation.instructions ?? ""} rows={3} maxLength={500} /></label>
        <p className="field-help">Editing updates the event in place. It does not send out-of-product notifications, so only publish changes you are prepared to own inside the current preview boundary.</p>
        {message ? <p role="status">{message}</p> : null}
        <button className="privacy-action" type="submit" disabled={submitting || experienceLevels.length === 0}>{submitting ? "Saving…" : "Save event changes"}</button>
      </form>
    </details>
  );
}
