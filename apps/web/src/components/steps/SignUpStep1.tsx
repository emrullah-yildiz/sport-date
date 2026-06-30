"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { dateOfBirthError } from "@sport-date/domain";
import { useState } from "react";
import { useSignUpStore } from "@/lib/sign-up-store";

export default function SignUpStep1() {
  const email = useSignUpStore((state) => state.email);
  const password = useSignUpStore((state) => state.password);
  const dateOfBirth = useSignUpStore((state) => state.dateOfBirth);
  const acceptedTerms = useSignUpStore((state) => state.acceptedTerms);
  const setField = useSignUpStore((state) => state.setField);
  const passwordStrength = [password.length >= 12, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;

  // Validate the birthday the moment it is entered/changed, not only at submit.
  // Reuses the same domain age logic as the final-submit guard.
  const [dobTouched, setDobTouched] = useState(false);
  const dobError = dobTouched && dateOfBirth ? dateOfBirthError(dateOfBirth) : null;

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
        <input
          id="signup-date-of-birth"
          type="date"
          autoComplete="bday"
          value={dateOfBirth}
          aria-invalid={dobError ? true : undefined}
          aria-describedby={dobError ? "signup-date-of-birth-error" : undefined}
          onChange={(event) => { setDobTouched(true); setField("dateOfBirth", event.target.value); }}
          onBlur={() => setDobTouched(true)}
        />
        <p className="field-format-hint">Date order follows your browser&apos;s region (e.g. dd/mm/yyyy in Europe).</p>
        {dobError ? <p id="signup-date-of-birth-error" className="field-error" role="alert">{dobError}</p> : null}
      </div>
      <label className="terms terms-check">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setField("acceptedTerms", event.target.checked)} />
        <span>
          I confirm I am 18+ and accept the <Link href="/terms">Terms preview</Link> and <Link href="/safety-guidelines">Safety Guidelines</Link>. I understand the <Link href="/privacy">Privacy Notice preview</Link> explains exports, deletion, and current data-use boundaries separately.
        </span>
      </label>
    </motion.div>
  );
}
