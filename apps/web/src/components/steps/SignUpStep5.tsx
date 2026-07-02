"use client";

import { motion } from "framer-motion";
import { useSignUpStore } from "@/lib/sign-up-store";

export default function SignUpStep5() {
  const state = useSignUpStore();
  return (
    <motion.div className="signup-step">
      <h1>Let&apos;s review your profile</h1>
      <div className="review-card">
        <div className="review-section"><h2>{state.firstName} {state.lastName}</h2><p className="location">{state.location}</p>{state.bio ? <p className="bio">&ldquo;{state.bio}&rdquo;</p> : null}</div>
        <div className="review-row"><span>Email:</span><span>{state.email}</span></div>
        <div className="review-row"><span>Sports:</span><div className="sports-tags">{state.sports.map((sport) => <span className="tag" key={sport.name}>{sport.name}</span>)}</div></div>
        <div className="review-row"><span>Looking for:</span><span className="capitalize">{state.seeking}</span></div>
      </div>
      <p className="review-note">You&apos;re all set. Create your account when everything looks right.</p>
    </motion.div>
  );
}
