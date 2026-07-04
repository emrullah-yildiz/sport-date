"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSignUpStore } from "@/lib/sign-up-store";

export default function StepCredentials() {
  const email = useSignUpStore((state) => state.email);
  const password = useSignUpStore((state) => state.password);
  const acceptedTerms = useSignUpStore((state) => state.acceptedTerms);
  const setField = useSignUpStore((state) => state.setField);
  const passwordStrength = [password.length >= 12, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;

  return (
    <motion.div className="signup-step">
      {/* Credentials are the FINAL input step (CX-20260704): the member has
          already built their profile, so this step frames the account as saving
          that work. The 12-char multi-class password policy + terms are unchanged. */}
      <h1>Save your profile</h1>
      <p>Last step — create the login that keeps the profile you just built.</p>
      <div className="form-group">
        <label htmlFor="signup-email">Email</label>
        <input id="signup-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setField("email", event.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="signup-password">Password</label>
        <input id="signup-password" type="password" autoComplete="new-password" placeholder="At least 12 characters" value={password} onChange={(event) => setField("password", event.target.value)} />
        {password ? <div className="password-strength"><div className="strength-bar"><div className="strength-fill" style={{ width: `${passwordStrength * 25}%` }} /></div><p className="strength-text">{["Very weak", "Weak", "Fair", "Good", "Strong"][passwordStrength]}</p></div> : null}
      </div>
      <label className="terms terms-check">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setField("acceptedTerms", event.target.checked)} />
        <span>
          I confirm I am 18+ and accept the <Link href="/terms">Terms preview</Link> and <Link href="/safety#guidelines">safety guidance</Link>. I understand the <Link href="/privacy">Privacy Notice preview</Link> explains exports, deletion, and current data-use boundaries separately.
        </span>
      </label>
    </motion.div>
  );
}
