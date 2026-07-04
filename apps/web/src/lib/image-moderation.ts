import "server-only";

// Pluggable, FAIL-SAFE image-safety moderation seam
// (CX-20260704-feature-image-moderation-nudity-block).
//
// Mirrors the photo-storage / EMAIL_DELIVERY_ENABLED dark pattern: the real
// classifier lives behind an owner-provisioned provider (env key). It is NOT
// wired to any vendor here — sending member images to a third party is an
// owner-gated decision (prefer an EU/GDPR-appropriate provider).
//
// The controlling rule: we must NEVER auto-approve an image we could not
// verify. So the decision is one of:
//   - "reject": the provider classed it nude / sexually-explicit → block at
//     upload; the bytes are never stored.
//   - "review": uncertain/borderline, OR no provider configured, OR the provider
//     errored → HOLD as pending (owner-only visibility) + route to the human
//     moderation queue. Fail toward caution, never open.
//   - "allow": a configured provider positively classed it clean.
//
// A provider is plugged in by registering an ImageClassifier for its id. Today
// the registry is empty, so any environment resolves to "review" — the safe
// default — until the owner both provisions a provider AND its classifier is
// implemented here.

export type ImageModerationDecision = "allow" | "reject" | "review";

export type ImageModerationOutcome = Readonly<{
  decision: ImageModerationDecision;
  provider: string;
  reason: string;
}>;

/**
 * A provider classifier: returns whether the image is explicit and/or uncertain,
 * or null when it could not classify (treated as "review" — never "allow").
 * Injected in tests; implemented per-provider when the owner wires one.
 */
export type ImageClassifier = (input: {
  contentType: string;
  bytes: Uint8Array;
}) => Promise<{ explicit: boolean; uncertain: boolean } | null>;

type ModerationEnvironment = Readonly<Record<string, string | undefined>>;

// Registry of real provider classifiers, keyed by IMAGE_MODERATION_PROVIDER
// value. Intentionally EMPTY until an owner-provisioned provider is implemented.
const CLASSIFIERS: Readonly<Record<string, ImageClassifier>> = {};

/** The configured provider id, or null when none is set (the local/dev/CI default). */
export function resolveImageModerationProvider(env: ModerationEnvironment = process.env): string | null {
  const provider = env.IMAGE_MODERATION_PROVIDER;
  if (typeof provider !== "string" || provider.trim().length === 0) return null;
  return provider.trim();
}

/** Whether an automated image check is active. False in local/dev/CI. */
export function isImageModerationConfigured(env: ModerationEnvironment = process.env): boolean {
  return resolveImageModerationProvider(env) !== null;
}

/**
 * Classify a profile image. FAIL-SAFE by construction:
 *   - no provider           → "review" (held pending; never "allow").
 *   - provider set, no impl  → "review".
 *   - classifier returns null or throws → "review" (never "allow" on error).
 *   - classifier says explicit          → "reject".
 *   - classifier says uncertain         → "review".
 *   - classifier says clean             → "allow".
 *
 * `classify` is injectable so the decision logic is unit-testable and so a real
 * provider can be supplied without touching callers.
 */
export async function moderateProfileImage(
  contentType: string,
  bytes: Uint8Array,
  options: { env?: ModerationEnvironment; classify?: ImageClassifier } = {},
): Promise<ImageModerationOutcome> {
  const env = options.env ?? process.env;
  const provider = resolveImageModerationProvider(env);

  if (!provider) {
    return { decision: "review", provider: "none", reason: "no-provider-fail-safe" };
  }

  const classify = options.classify ?? CLASSIFIERS[provider];
  if (!classify) {
    return { decision: "review", provider, reason: "provider-not-implemented" };
  }

  try {
    const result = await classify({ contentType, bytes });
    if (!result) return { decision: "review", provider, reason: "unclassified" };
    if (result.explicit) return { decision: "reject", provider, reason: "explicit" };
    if (result.uncertain) return { decision: "review", provider, reason: "uncertain" };
    return { decision: "allow", provider, reason: "clean" };
  } catch {
    // A provider outage must never let an unverified image through.
    return { decision: "review", provider, reason: "provider-error" };
  }
}
