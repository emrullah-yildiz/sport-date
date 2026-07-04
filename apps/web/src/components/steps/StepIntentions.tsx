"use client";

import { motion } from "framer-motion";
import type { Seeking } from "@sport-date/domain";
import { BRAND_NAME } from "@/lib/brand";
import { useSignUpStore } from "@/lib/sign-up-store";

const seekingOptions: Array<{ value: Seeking; label: string; description: string }> = [
  { value: "dating", label: "Dating", description: "Open to meeting a romantic partner — a real connection, not a hookup" },
  { value: "friendship", label: "Friendship", description: "Looking for people to play with" },
  { value: "group", label: "Group events", description: "Focused on social sports activities" },
];

export default function StepIntentions() {
  const bio = useSignUpStore((state) => state.bio);
  const seeking = useSignUpStore((state) => state.seeking);
  const setField = useSignUpStore((state) => state.setField);
  return (
    <motion.div className="signup-step">
      <h1>What are you here for?</h1>
      <div className="form-group">
        <span className="field-label">What kind of connection are you looking for?</span>
        <div className="seeking-options">{seekingOptions.map((option) => <button type="button" key={option.value} aria-pressed={seeking === option.value} className={`seeking-card ${seeking === option.value ? "active" : ""}`} onClick={() => setField("seeking", option.value)}><strong>{option.label}</strong><span>{option.description}</span></button>)}</div>
      </div>
      <div className="form-group">
        <label htmlFor="signup-bio">Bio (optional)</label>
        <textarea id="signup-bio" value={bio} onChange={(event) => setField("bio", event.target.value.slice(0, 200))} placeholder={`What brings you to ${BRAND_NAME}?`} rows={3} />
        <p className="char-count">{bio.length}/200</p>
      </div>
    </motion.div>
  );
}
