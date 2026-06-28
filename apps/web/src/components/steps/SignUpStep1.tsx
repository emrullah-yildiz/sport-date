"use client";

import { motion } from "framer-motion";
import { useSignUpStore } from "@/lib/sign-up-store";

export default function SignUpStep1() {
  const email = useSignUpStore((state) => state.email);
  const password = useSignUpStore((state) => state.password);
  const dateOfBirth = useSignUpStore((state) => state.dateOfBirth);
  const acceptedTerms = useSignUpStore((state) => state.acceptedTerms);
  const setField = useSignUpStore((state) => state.setField);
  const passwordStrength = [password.length >= 12, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;

  return (
    <motion.div className="signup-step">
      <h2>Let&apos;s get started</h2>
      <div className="form-group">
        <label htmlFor="signup-email">Email</label>
        <input id="signup-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setField("email", event.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="signup-password">Password</label>
        <input id="signup-password" type="password" autoComplete="new-password" placeholder="At least 12 characters" value={password} onChange={(event) => setField("password", event.target.value)} />
        {password ? <div className="password-strength"><div className="strength-bar"><div className="strength-fill" style={{ width: `${passwordStrength * 25}%` }} /></div><p className="strength-text">{["Very weak", "Weak", "Fair", "Good", "Strong"][passwordStrength]}</p></div> : null}
      </div>
      <div className="form-group">
        <label htmlFor="signup-date-of-birth">Date of Birth (18+ only)</label>
        <input id="signup-date-of-birth" type="date" autoComplete="bday" value={dateOfBirth} onChange={(event) => setField("dateOfBirth", event.target.value)} />
      </div>
      <label className="terms terms-check">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setField("acceptedTerms", event.target.checked)} />
        <span>I confirm I am 18+ and accept the Terms and Safety Guidelines.</span>
      </label>
    </motion.div>
  );
}

