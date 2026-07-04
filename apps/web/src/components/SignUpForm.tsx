"use client";

import { validateRegistration } from "@sport-date/domain";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { type ComponentType, useState } from "react";

import { BRAND_NAME } from "@/lib/brand";
import { SIGN_UP_STEP_ORDER, signUpStepError } from "@/lib/sign-up-steps";
import { useSignUpStore } from "@/lib/sign-up-store";
import StepName from "./steps/StepName";
import StepGender from "./steps/StepGender";
import StepOrientation from "./steps/StepOrientation";
import StepBirthday from "./steps/StepBirthday";
import StepSports from "./steps/StepSports";
import StepIntentions from "./steps/StepIntentions";
import StepPhotos from "./steps/StepPhotos";
import StepLocation from "./steps/StepLocation";
import StepCredentials from "./steps/StepCredentials";
import StepReview from "./steps/StepReview";

// Interactive, one-question-per-step signup (CX-20260704-interactive-onboarding-
// gender-orientation). Each step asks a single focused thing; the order is the
// tested source of truth in @/lib/sign-up-steps (SIGN_UP_STEP_ORDER), and the
// per-step gate below validates by that same sequence. Credentials stay LAST
// (investment first, credentials last — the prior conversion decision); the
// password / DOB / terms REQUIREMENTS are unchanged, only their position. All
// answers live in the zustand store, so moving Back never loses anything.
const stepComponents: Record<(typeof SIGN_UP_STEP_ORDER)[number], ComponentType> = {
  name: StepName,
  gender: StepGender,
  orientation: StepOrientation,
  birthday: StepBirthday,
  sports: StepSports,
  intentions: StepIntentions,
  photos: StepPhotos,
  location: StepLocation,
  credentials: StepCredentials,
  review: StepReview,
};
const steps = SIGN_UP_STEP_ORDER.map((id) => stepComponents[id]);

export default function SignUpForm({ emailDeliveryLive = false }: { emailDeliveryLive?: boolean } = {}) {
  const step = useSignUpStore((state) => state.step);
  const setStep = useSignUpStore((state) => state.setStep);
  const reset = useSignUpStore((state) => state.reset);
  // Reduced-motion parity (docs/design-system.md — non-negotiable), mirroring
  // MomentGlow / JoinRequestControls / HostRequestDecision. framer-motion does
  // NOT honour prefers-reduced-motion on its own, so we gate it here. To stay
  // hydration-safe we keep `initial` unconditional (identical SSR + first client
  // paint — the MomentGlow lesson) and only zero the `transition` under reduced
  // motion: framer snaps straight to the `animate` value with no frames, so the
  // card entrance rise and the per-step horizontal slide play no animation while
  // the step content still switches instantly. Motion is unchanged when off.
  const reducedMotion = useReducedMotion();
  const snapTransition = reducedMotion ? { duration: 0 } : undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");
  const CurrentStep = steps[step - 1];

  const handleNext = () => {
    const message = signUpStepError(step, useSignUpStore.getState());
    if (message) return setError(message);
    setError("");
    if (step < steps.length) setStep(step + 1);
  };

  const handlePrev = () => {
    setError("");
    if (step > 1) setStep(step - 1);
  };

  // Best-effort: upload the optional photos the member selected during signup to
  // the existing authenticated endpoint now that the session cookie is set. The
  // first becomes their primary photo. A failure here never blocks account
  // creation — they can add photos later from their profile.
  const uploadSelectedPhotos = async (files: File[]) => {
    for (const file of files) {
      try {
        const form = new FormData();
        form.append("photo", file);
        await fetch("/api/account/photos", { method: "POST", body: form });
      } catch {
        // Ignore — photos are optional and can be added later.
      }
    }
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
      const selectedPhotos = [...state.additionalPhotos];
      if (selectedPhotos.length > 0) await uploadSelectedPhotos(selectedPhotos);
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
          <p>
            {emailDeliveryLive
              ? "Your profile stays private. Whenever you're ready, you can verify your email from account security — request a link and we'll send it to your inbox."
              : "Your profile stays private. Email verification delivery isn't switched on yet — you'll be able to prepare it from account security as soon as it is."}
          </p>
          <a className="btn-primary success-link" href="/profile">View your private profile</a>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-container">
      <motion.div className="signup-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={snapTransition}>
        <div className="signup-header">
          <p className="signup-brand">Join {BRAND_NAME}</p>
          <p className="step-indicator">Step {step} of {steps.length}</p>
          <div className="progress-bar"><div style={{ width: `${(step / steps.length) * 100}%` }} /></div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={snapTransition}>
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

        {/* Reciprocal path back to sign-in — mirrors the login form's
            "New here? Create a profile" cross-link so a returning member who
            lands on signup is never stranded without a route to /login. */}
        <p className="auth-switch">
          Already have a profile? <Link href="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
