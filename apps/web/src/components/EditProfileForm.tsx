"use client";

import type { RegistrationSport, Seeking, SportFrequency, SportSkillLevel } from "@sport-date/domain";
import { useState } from "react";

type EditableProfile = {
  firstName: string;
  lastName: string;
  location: string;
  bio: string;
  languages: readonly string[];
  seeking: Seeking;
  sports: readonly RegistrationSport[];
};

export default function EditProfileForm({ profile }: { profile: EditableProfile }) {
  const [fields, setFields] = useState({
    ...profile,
    languagesText: profile.languages.join(", "),
    sports: profile.sports.map((sport) => ({ ...sport })),
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateSport(index: number, update: Partial<RegistrationSport>) {
    setFields((current) => ({ ...current, sports: current.sports.map((sport, itemIndex) => itemIndex === index ? { ...sport, ...update } : sport) }));
  }

  function removeSport(index: number) {
    setFields((current) => ({ ...current, sports: current.sports.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fields.firstName, lastName: fields.lastName, location: fields.location,
          bio: fields.bio, seeking: fields.seeking, sports: fields.sports,
          languages: fields.languagesText.split(",").map((language) => language.trim()).filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Profile update failed.");
      setMessage("Profile updated.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile update failed.");
      setSaving(false);
    }
  }

  return (
    <details className="edit-profile">
      <summary>Edit your profile</summary>
      <form onSubmit={submit}>
        <div className="edit-profile-row"><label>First name<input value={fields.firstName} onChange={(event) => setFields({ ...fields, firstName: event.target.value })} /></label><label>Last name<input value={fields.lastName} onChange={(event) => setFields({ ...fields, lastName: event.target.value })} /></label></div>
        <label>City or region<input value={fields.location} onChange={(event) => setFields({ ...fields, location: event.target.value })} /></label>
        <label>Languages, separated by commas<input value={fields.languagesText} onChange={(event) => setFields({ ...fields, languagesText: event.target.value })} /></label>
        <label>What are you looking for?<select value={fields.seeking} onChange={(event) => setFields({ ...fields, seeking: event.target.value as Seeking })}><option value="dating">Dating</option><option value="friendship">Friendship</option><option value="group">Group events</option></select></label>
        <label>Bio<textarea rows={3} maxLength={200} value={fields.bio} onChange={(event) => setFields({ ...fields, bio: event.target.value })} /></label>
        <fieldset><legend>Your sports</legend>{fields.sports.map((sport, index) => <div className="edit-sport-row" key={index}><input aria-label={`Sport ${index + 1}`} value={sport.name} onChange={(event) => updateSport(index, { name: event.target.value })} /><select aria-label={`${sport.name || `Sport ${index + 1}`} skill level`} value={sport.skillLevel} onChange={(event) => updateSport(index, { skillLevel: event.target.value as SportSkillLevel })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select><select aria-label={`${sport.name || `Sport ${index + 1}`} frequency`} value={sport.frequency} onChange={(event) => updateSport(index, { frequency: event.target.value as SportFrequency })}><option value="weekly">Weekly</option><option value="biweekly">Every two weeks</option><option value="monthly">Monthly</option><option value="casual">Casual</option></select><button className="remove-sport" type="button" onClick={() => removeSport(index)} disabled={fields.sports.length === 1}>Remove</button></div>)}<button className="add-sport" type="button" disabled={fields.sports.length >= 5} onClick={() => setFields((current) => ({ ...current, sports: [...current.sports, { name: "", skillLevel: "beginner", frequency: "casual" }] }))}>Add another sport</button></fieldset>
        {message ? <p role="status">{message}</p> : null}
        <button className="privacy-action" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
      </form>
    </details>
  );
}
