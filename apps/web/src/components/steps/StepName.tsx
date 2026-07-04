"use client";

import { motion } from "framer-motion";
import { useSignUpStore } from "@/lib/sign-up-store";

export default function StepName() {
  const firstName = useSignUpStore((state) => state.firstName);
  const lastName = useSignUpStore((state) => state.lastName);
  const setField = useSignUpStore((state) => state.setField);

  return (
    <motion.div className="signup-step">
      <h1>What should we call you?</h1>
      <p>Your first name is how people will see you. Your last name stays private.</p>
      <div className="form-group">
        <label htmlFor="signup-first-name">First name</label>
        <input id="signup-first-name" autoComplete="given-name" value={firstName} onChange={(event) => setField("firstName", event.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="signup-last-name">Last name</label>
        <input id="signup-last-name" autoComplete="family-name" value={lastName} onChange={(event) => setField("lastName", event.target.value)} />
      </div>
    </motion.div>
  );
}
