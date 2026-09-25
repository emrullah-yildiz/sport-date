"use client";

import { motion } from "framer-motion";
import ConnectionChoices from "../ConnectionChoices";
import { BRAND_NAME } from "@/lib/brand";
import { useSignUpStore } from "@/lib/sign-up-store";

export default function StepIntentions() {
  const bio = useSignUpStore((state) => state.bio);
  const seeking = useSignUpStore((state) => state.seekingPreferences);
  const setField = useSignUpStore((state) => state.setField);
  return (
    <motion.div className="signup-step">
      <h1>What are you here for?</h1>
      <div className="form-group">
        <span className="field-label">What kind of connection are you looking for?</span>
        <ConnectionChoices value={seeking} onChange={(value) => setField("seekingPreferences", value)} />
      </div>
      <div className="form-group">
        <label htmlFor="signup-bio">Bio (optional)</label>
        <textarea id="signup-bio" value={bio} onChange={(event) => setField("bio", event.target.value.slice(0, 200))} placeholder={`What brings you to ${BRAND_NAME}?`} rows={3} />
        <p className="char-count">{bio.length}/200</p>
      </div>
    </motion.div>
  );
}
