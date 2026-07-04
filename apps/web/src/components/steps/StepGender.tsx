"use client";

import { motion } from "framer-motion";
import { SELF_DESCRIBE_MAX } from "@sport-date/domain";
import { useSignUpStore } from "@/lib/sign-up-store";
import { GENDER_CHOICES } from "@/lib/sensitive-profile-options";

export default function StepGender() {
  const gender = useSignUpStore((state) => state.gender);
  const genderSelfDescribe = useSignUpStore((state) => state.genderSelfDescribe);
  const genderVisible = useSignUpStore((state) => state.genderVisible);
  const setField = useSignUpStore((state) => state.setField);

  return (
    <motion.div className="signup-step">
      <h1>How do you describe your gender?</h1>
      <p>Optional, and yours to change anytime. It stays private unless you choose to show it.</p>
      <div className="form-group">
        <div className="choice-grid" role="group" aria-label="Gender">
          {GENDER_CHOICES.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={gender === option.value}
              className={`choice-chip ${gender === option.value ? "active" : ""}`}
              onClick={() => setField("gender", gender === option.value ? null : option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {gender === "self_describe" ? (
        <div className="form-group">
          <label htmlFor="signup-gender-self-describe">Describe your gender</label>
          <input
            id="signup-gender-self-describe"
            value={genderSelfDescribe}
            maxLength={SELF_DESCRIBE_MAX}
            onChange={(event) => setField("genderSelfDescribe", event.target.value)}
            placeholder="In your own words"
          />
          <p className="char-count">{genderSelfDescribe.length}/{SELF_DESCRIBE_MAX}</p>
        </div>
      ) : null}
      {gender && gender !== "prefer_not_to_say" ? (
        <label className="terms-check">
          <input type="checkbox" checked={genderVisible} onChange={(event) => setField("genderVisible", event.target.checked)} />
          <span>Show my gender on my profile. Off by default — you can change this whenever you like.</span>
        </label>
      ) : null}
    </motion.div>
  );
}
