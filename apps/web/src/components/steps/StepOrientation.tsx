"use client";

import { motion } from "framer-motion";
import { SELF_DESCRIBE_MAX } from "@sport-date/domain";
import { useSignUpStore } from "@/lib/sign-up-store";
import { SEXUAL_ORIENTATION_CHOICES } from "@/lib/sensitive-profile-options";

// Sexual orientation is GDPR Article 9 SPECIAL-CATEGORY data. It is OPTIONAL and
// never required to finish signup. It is stored ONLY with an explicit, unbundled
// opt-in (the consent checkbox below — separate from the Terms acceptance): the
// domain sanitizer + a DB CHECK both drop any orientation value that has no
// consent, so a member who picks one but does not tick the box stores nothing.
export default function StepOrientation() {
  const sexualOrientation = useSignUpStore((state) => state.sexualOrientation);
  const orientationSelfDescribe = useSignUpStore((state) => state.orientationSelfDescribe);
  const orientationConsent = useSignUpStore((state) => state.orientationConsent);
  const orientationVisible = useSignUpStore((state) => state.orientationVisible);
  const setField = useSignUpStore((state) => state.setField);

  function chooseOrientation(value: (typeof SEXUAL_ORIENTATION_CHOICES)[number]["value"]) {
    if (sexualOrientation === value) {
      // Deselecting clears the sensitive value AND its consent/visibility, so no
      // orphaned consent stamp survives without a value.
      setField("sexualOrientation", null);
      setField("orientationConsent", false);
      setField("orientationVisible", false);
      return;
    }
    setField("sexualOrientation", value);
  }

  return (
    <motion.div className="signup-step">
      <h1>What&rsquo;s your sexual orientation?</h1>
      <p>Optional, and never needed to finish signing up. We ask because it can help match you for dating later — you decide whether to share it.</p>
      <div className="form-group">
        <div className="choice-grid" role="group" aria-label="Sexual orientation">
          {SEXUAL_ORIENTATION_CHOICES.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={sexualOrientation === option.value}
              className={`choice-chip ${sexualOrientation === option.value ? "active" : ""}`}
              onClick={() => chooseOrientation(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {sexualOrientation === "self_describe" ? (
        <div className="form-group">
          <label htmlFor="signup-orientation-self-describe">Describe your orientation</label>
          <input
            id="signup-orientation-self-describe"
            value={orientationSelfDescribe}
            maxLength={SELF_DESCRIBE_MAX}
            onChange={(event) => setField("orientationSelfDescribe", event.target.value)}
            placeholder="In your own words"
          />
          <p className="char-count">{orientationSelfDescribe.length}/{SELF_DESCRIBE_MAX}</p>
        </div>
      ) : null}

      {sexualOrientation ? (
        <div className="consent-block">
          <label className="terms-check">
            <input
              type="checkbox"
              checked={orientationConsent}
              onChange={(event) => {
                setField("orientationConsent", event.target.checked);
                if (!event.target.checked) setField("orientationVisible", false);
              }}
            />
            <span>
              Store my sexual orientation. It&rsquo;s used only to help match me for dating, it&rsquo;s optional, and I can change or delete it anytime. It is <strong>not</strong> shown publicly unless I choose to show it.
            </span>
          </label>
          {!orientationConsent ? (
            <p className="consent-hint" role="note">Without this box ticked, your orientation won&rsquo;t be saved — that&rsquo;s completely fine.</p>
          ) : null}
          {orientationConsent ? (
            <label className="terms-check">
              <input type="checkbox" checked={orientationVisible} onChange={(event) => setField("orientationVisible", event.target.checked)} />
              <span>Also show it on my profile. Off by default.</span>
            </label>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}
