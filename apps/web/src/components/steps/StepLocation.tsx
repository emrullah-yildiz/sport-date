"use client";

import { motion } from "framer-motion";
import { useSignUpStore } from "@/lib/sign-up-store";

export default function StepLocation() {
  const location = useSignUpStore((state) => state.location);
  const setField = useSignUpStore((state) => state.setField);

  return (
    <motion.div className="signup-step">
      <h1>Where are you based?</h1>
      <p>A city or region is enough — we never show a precise address, and never before you accept a join.</p>
      <div className="form-group">
        <label htmlFor="signup-location">Location (city or region)</label>
        <input id="signup-location" autoComplete="address-level2" value={location} onChange={(event) => setField("location", event.target.value)} placeholder="e.g. Bucharest" />
      </div>
    </motion.div>
  );
}
