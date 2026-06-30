"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useSignUpStore } from "@/lib/sign-up-store";

// Every kind of sportive meet-up — physical or mind sport — including chess.
// If a member's game isn't here, they can add their own below.
const sports = [
  { name: "Running", symbol: "R" }, { name: "Tennis", symbol: "T" },
  { name: "Padel", symbol: "P" }, { name: "Football", symbol: "F" },
  { name: "Basketball", symbol: "BB" }, { name: "Volleyball", symbol: "V" },
  { name: "Bouldering", symbol: "BL" }, { name: "Climbing", symbol: "CL" },
  { name: "Hiking", symbol: "H" }, { name: "Cycling", symbol: "CY" },
  { name: "Swimming", symbol: "SW" }, { name: "Yoga", symbol: "Y" },
  { name: "Dance", symbol: "D" }, { name: "Table Tennis", symbol: "TT" },
  { name: "Badminton", symbol: "BM" }, { name: "Chess", symbol: "CH" },
];

const MAX_SPORTS = 5;
const MAX_SPORT_NAME = 60;

export default function SignUpStep3() {
  const selected = useSignUpStore((state) => state.sports);
  const addSport = useSignUpStore((state) => state.addSport);
  const removeSport = useSignUpStore((state) => state.removeSport);
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState("");

  const atLimit = selected.length >= MAX_SPORTS;

  const toggleSport = (name: string) => {
    if (selected.some((sport) => sport.name.toLowerCase() === name.toLowerCase())) removeSport(name);
    else if (!atLimit) addSport({ name, skillLevel: "intermediate", frequency: "weekly" });
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return setCustomError("Enter a sport name.");
    if (name.length > MAX_SPORT_NAME) return setCustomError("Keep the sport name under 60 characters.");
    if (selected.some((sport) => sport.name.toLowerCase() === name.toLowerCase())) return setCustomError("That sport is already on your list.");
    if (atLimit) return setCustomError("You can choose up to five sports.");
    addSport({ name, skillLevel: "intermediate", frequency: "weekly" });
    setCustom("");
    setCustomError("");
  };

  const presetNames = new Set(sports.map((sport) => sport.name.toLowerCase()));
  const customSelected = selected.filter((sport) => !presetNames.has(sport.name.toLowerCase()));

  return (
    <motion.div className="signup-step">
      <h2>What sports do you play?</h2>
      <p>Choose between one and five — physical or mind sports. You can refine skill levels later.</p>
      <div className="sports-grid">
        {sports.map((sport) => {
          const active = selected.some((item) => item.name.toLowerCase() === sport.name.toLowerCase());
          return (
            <button type="button" key={sport.name} aria-pressed={active} disabled={!active && atLimit} className={`sport-card ${active ? "active" : ""}`} onClick={() => toggleSport(sport.name)}>
              <span className="sport-emoji">{sport.symbol}</span><span>{sport.name}</span>
            </button>
          );
        })}
      </div>

      {customSelected.length > 0 ? (
        <div className="custom-sport-tags">
          {customSelected.map((sport) => (
            <button type="button" key={sport.name} className="custom-sport-tag" onClick={() => removeSport(sport.name)}>
              {sport.name}<span aria-hidden="true">×</span><span className="visually-hidden">remove {sport.name}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="custom-sport">
        <label htmlFor="signup-custom-sport">Don&apos;t see your sport? Add your own.</label>
        <div className="custom-sport-row">
          <input
            id="signup-custom-sport"
            type="text"
            placeholder="e.g. Surfing, Fencing, Go"
            value={custom}
            maxLength={MAX_SPORT_NAME}
            disabled={atLimit}
            aria-invalid={customError ? true : undefined}
            aria-describedby={customError ? "signup-custom-sport-error" : undefined}
            onChange={(event) => { setCustom(event.target.value); if (customError) setCustomError(""); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustom(); } }}
          />
          <button type="button" className="btn-primary custom-sport-add" onClick={addCustom} disabled={atLimit || !custom.trim()}>Add</button>
        </div>
        {customError ? <p id="signup-custom-sport-error" className="field-error" role="alert">{customError}</p> : null}
        {atLimit ? <p className="custom-sport-hint">You&apos;ve picked the maximum of five sports.</p> : null}
      </div>
    </motion.div>
  );
}
