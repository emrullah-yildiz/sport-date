"use client";

import { motion } from "framer-motion";
import { useSignUpStore } from "@/lib/sign-up-store";

export default function SignUpStep2() {
  const firstName = useSignUpStore((state) => state.firstName);
  const lastName = useSignUpStore((state) => state.lastName);
  const location = useSignUpStore((state) => state.location);
  const setField = useSignUpStore((state) => state.setField);

  return (
    <motion.div className="signup-step">
      <h1>Your profile</h1>
      <div className="form-group"><label htmlFor="signup-first-name">First name</label><input id="signup-first-name" autoComplete="given-name" value={firstName} onChange={(event) => setField("firstName", event.target.value)} /></div>
      <div className="form-group"><label htmlFor="signup-last-name">Last name</label><input id="signup-last-name" autoComplete="family-name" value={lastName} onChange={(event) => setField("lastName", event.target.value)} /></div>
      <div className="form-group"><label htmlFor="signup-location">Location (city or region)</label><input id="signup-location" autoComplete="address-level2" value={location} onChange={(event) => setField("location", event.target.value)} placeholder="e.g. Bucharest" /></div>
    </motion.div>
  );
}

