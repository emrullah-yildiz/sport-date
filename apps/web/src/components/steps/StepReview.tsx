"use client";

import { motion } from "framer-motion";
import { useSignUpStore } from "@/lib/sign-up-store";
import { genderDisplay, orientationDisplay } from "@/lib/sensitive-profile-options";

export default function StepReview() {
  const state = useSignUpStore();
  // Orientation only appears here when the member gave the explicit opt-in —
  // mirroring exactly what will (and won't) be stored.
  const gender = genderDisplay(state.gender, state.genderSelfDescribe);
  const orientation = state.orientationConsent
    ? orientationDisplay(state.sexualOrientation, state.orientationSelfDescribe)
    : null;
  const photoCount = state.additionalPhotos.length;
  return (
    <motion.div className="signup-step">
      <h1>Let&rsquo;s review your profile</h1>
      <div className="review-card">
        <div className="review-section"><h2>{state.firstName} {state.lastName}</h2><p className="location">{state.location}</p>{state.bio ? <p className="bio">&ldquo;{state.bio}&rdquo;</p> : null}</div>
        <div className="review-row"><span>Email:</span><span>{state.email}</span></div>
        <div className="review-row"><span>Sports:</span><div className="sports-tags">{state.sports.map((sport) => <span className="tag" key={sport.name}>{sport.name}</span>)}</div></div>
        <div className="review-row"><span>Looking for:</span><span className="capitalize">{state.seeking}</span></div>
        {gender ? (
          <div className="review-row"><span>Gender:</span><span>{gender}{state.genderVisible ? "" : " · private"}</span></div>
        ) : null}
        {orientation ? (
          <div className="review-row"><span>Orientation:</span><span>{orientation}{state.orientationVisible ? "" : " · private"}</span></div>
        ) : null}
        {photoCount > 0 ? (
          <div className="review-row"><span>Photos:</span><span>{photoCount} selected — added after your account is created</span></div>
        ) : null}
      </div>
      <p className="review-note">You&rsquo;re all set. Create your account when everything looks right.</p>
    </motion.div>
  );
}
