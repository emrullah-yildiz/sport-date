"use client";

import { dateOfBirthError, validateRegistration } from "@sport-date/domain";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { BRAND_NAME } from "@/lib/brand";
import { useSignUpStore, type SignUpState } from "@/lib/sign-up-store";
import SignUpStep1 from "./steps/SignUpStep1";
import SignUpStep2 from "./steps/SignUpStep2";
import SignUpStep3 from "./steps/SignUpStep3";
import SignUpStep4 from "./steps/SignUpStep4";
import SignUpStep5 from "./steps/SignUpStep5";

const steps = [SignUpStep1, SignUpStep2, SignUpStep3, SignUpStep4, SignUpStep5];

function stepError(step: number, state: SignUpState): string | null {
  if (step === 1) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) return "Enter a valid email address.";
    if (state.password.length < 12) return "Use at least 12 characters for your password.";
    if (!/[a-z]/.test(state.password) || !/[A-Z]/.test(state.password) || !/\d/.test(state.password)) {
      return "Include upper-case, lower-case, and numeric characters.";
    }
    const dobError = dateOfBirthError(state.dateOfBirth);
    if (dobError) return dobError;
    if (!state.acceptedTerms) return "Confirm the Terms and Safety Guidelines to continue.";
  }
  if (step === 2 && (!state.firstName.trim() || !state.lastName.trim() || !state.location.trim())) {
    return "Complete your name and location.";
  }
  if (step === 3 && state.sports.length === 0) return "Choose at least one sport.";
  if (step === 4 && state.bio.length > 200) return "Keep your bio within 200 characters.";
  return null;
}

export default function SignUpForm() {
  const step = useSignUpStore((state) => state.step);
  const setStep = useSignUpStore((state) => state.setStep);
  const reset = useSignUpStore((state) => state.reset);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");
  const CurrentStep = steps[step - 1];

  const handleNext = () => {
    const message = stepError(step, useSignUpStore.getState());
    if (message) return setError(message);
    setError("");
    if (step < steps.length) setStep(step + 1);
  };

  const handlePrev = () => {
    setError("");
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError("");
    const state = useSignUpStore.getState();
    const validation = validateRegistration(state);
    if (!validation.valid) return setError(validation.errors[0]);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Registration failed.");
      reset();
      setIsComplete(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="signup-container">
        <div className="signup-card signup-success">
          <p className="step-indicator">Account created</p>
          <h1>Welcome to {BRAND_NAME}.</h1>
          <p>Email verification delivery is not active yet. Your profile remains private, and you will be able to prepare verification from account security once delivery is approved.</p>
          <a className="btn-primary success-link" href="/profile">View your private profile</a>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-container">
      <motion.div className="signup-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="signup-header">
          <p className="signup-brand">Join {BRAND_NAME}</p>
          <p className="step-indicator">Step {step} of {steps.length}</p>
          <div className="progress-bar"><div style={{ width: `${(step / steps.length) * 100}%` }} /></div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <CurrentStep />
          </motion.div>
        </AnimatePresence>

        {error ? <div className="error-message" role="alert">{error}</div> : null}

        <div className={`signup-actions${step === 1 ? " single" : ""}`}>
          {step > 1 ? (
            <button className="btn-secondary" type="button" onClick={handlePrev}>Back</button>
          ) : null}
          {step < steps.length ? (
            <button className="btn-primary" type="button" onClick={handleNext}>Next</button>
          ) : (
            <button className="btn-primary" type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
