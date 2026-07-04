"use client";

import { motion } from "framer-motion";
import { dateOfBirthError } from "@sport-date/domain";
import { useState } from "react";
import { useSignUpStore } from "@/lib/sign-up-store";

export default function StepBirthday() {
  const dateOfBirth = useSignUpStore((state) => state.dateOfBirth);
  const setField = useSignUpStore((state) => state.setField);

  // Validate the birthday the moment it is entered/changed, not only when the
  // member tries to advance. Reuses the same domain age logic as the step gate
  // and the final-submit guard, so the 18+ rule stays a single source of truth.
  const [dobTouched, setDobTouched] = useState(false);
  const dobError = dobTouched && dateOfBirth ? dateOfBirthError(dateOfBirth) : null;

  return (
    <motion.div className="signup-step">
      <h1>When&rsquo;s your birthday?</h1>
      <p>You need to be 18 or older. We show your age, never your date of birth.</p>
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
    </motion.div>
  );
}
