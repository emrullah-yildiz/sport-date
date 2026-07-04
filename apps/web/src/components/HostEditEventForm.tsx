"use client";

import type { ExperienceLevel } from "@sport-date/domain";
import { useState } from "react";

import AddressAutocomplete from "@/components/AddressAutocomplete";

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
  privateLocation: { venueName: string; address: string; postalCode: string | null; latitude: number | null; longitude: number | null; instructions: string | null };
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
            postalCode: form.get("postalCode"),
            instructions: form.get("instructions"),
            latitude: form.get("latitude") ? Number(form.get("latitude")) : null,
            longitude: form.get("longitude") ? Number(form.get("longitude")) : null,
          },
        },
      };

      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string; severity?: "routine" | "critical" };
      if (!response.ok) throw new Error(result.error || "Event update failed.");
      setMessage(
        result.severity === "critical"
          ? "Critical update saved. Accepted members will see the newest change flagged when they open the room."
          : "Event updated. Accepted members keep access, but any changed details are now authoritative.",
      );
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
          <label>Places for others<input name="capacity" type="number" min="2" max="20" defaultValue={event.capacity} required aria-describedby="edit-capacity-hint" /><span id="edit-capacity-hint" className="field-format-hint">You&apos;re already in as host — this is how many others can join, not counting you.</span></label>
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
        <p className="field-help">Discovery only sees the approximate area (city and district). The exact pin, address, and postal code stay private until you accept someone.</p>
        <label>Place name<input name="venueName" defaultValue={event.privateLocation.venueName} required maxLength={120} /></label>
        <AddressAutocomplete initial={{ address: event.privateLocation.address, latitude: event.privateLocation.latitude, longitude: event.privateLocation.longitude, city: event.publicLocation.city, countryCode: event.publicLocation.countryCode, areaLabel: event.publicLocation.areaLabel, postalCode: event.privateLocation.postalCode }} />
        <label>Arrival details<textarea name="instructions" defaultValue={event.privateLocation.instructions ?? ""} rows={3} maxLength={500} /></label>
        <p className="field-help">Editing updates the event in place. Time, venue, area, duration, and arrival changes are treated as critical inside the room. Nothing sends out-of-product notifications yet, so only publish changes you are prepared to own inside the current preview boundary.</p>
        {message ? <p role="status">{message}</p> : null}
        <button className="privacy-action" type="submit" disabled={submitting || experienceLevels.length === 0}>{submitting ? "Saving..." : "Save event changes"}</button>
      </form>
    </details>
  );
}
