import "server-only";

import type { Gender, SexualOrientation } from "@sport-date/domain";

import { getDatabase } from "@/lib/db";

// The optional, GDPR-careful gender + sexual-orientation fields, read on their
// OWN dedicated query — deliberately NOT folded into getCurrentUser(). That auth
// helper runs on the broadly-rendered landing/root path, and the release-safety
// rule (apps/web/AGENTS.md) is that a new column read there before production is
// migrated is a site-wide outage. Keeping these columns out of the hot path means
// a brief migration lag degrades only the profile editor's sensitive section, not
// the whole site.

export type SensitiveProfile = Readonly<{
  gender: Gender | null;
  genderSelfDescribe: string;
  genderVisible: boolean;
  sexualOrientation: SexualOrientation | null;
  orientationSelfDescribe: string;
  orientationVisible: boolean;
  /** True when a stored orientation value has a recorded consent stamp. */
  orientationConsent: boolean;
}>;

type SensitiveProfileRow = {
  gender: Gender | null;
  gender_self_describe: string | null;
  gender_visible: boolean;
  sexual_orientation: SexualOrientation | null;
  orientation_self_describe: string | null;
  orientation_consent_at: string | Date | null;
  orientation_visible: boolean;
};

export async function getSensitiveProfile(userId: string): Promise<SensitiveProfile> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT gender, gender_self_describe, gender_visible,
           sexual_orientation, orientation_self_describe, orientation_consent_at, orientation_visible
    FROM users
    WHERE id = ${userId} AND account_status = 'active'
    LIMIT 1
  ` as unknown as SensitiveProfileRow[];
  const row = rows[0];
  if (!row) {
    return {
      gender: null, genderSelfDescribe: "", genderVisible: false,
      sexualOrientation: null, orientationSelfDescribe: "", orientationVisible: false,
      orientationConsent: false,
    };
  }
  return {
    gender: row.gender,
    genderSelfDescribe: row.gender_self_describe ?? "",
    genderVisible: row.gender_visible,
    sexualOrientation: row.sexual_orientation,
    orientationSelfDescribe: row.orientation_self_describe ?? "",
    orientationVisible: row.orientation_visible,
    orientationConsent: row.orientation_consent_at != null,
  };
}
