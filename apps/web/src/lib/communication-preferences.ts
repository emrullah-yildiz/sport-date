import "server-only";

import crypto from "node:crypto";

import { getDatabase } from "@/lib/db";

export type CommunicationPreferences = Readonly<{
  serviceEmails: true;
  safetyEmails: true;
  productUpdatesOptIn: boolean;
  productUpdatesUpdatedAt: string | null;
  productUpdatesSource: "member_default" | "member_profile" | "operator_import";
  consentHistory: ReadonlyArray<{
    id: string;
    preferenceKey: "product_updates";
    previousValue: boolean | null;
    newValue: boolean;
    source: "member_default" | "member_profile" | "operator_import";
    lawfulBasisNote: string;
    createdAt: string;
  }>;
}>;

type PreferenceRow = {
  product_updates_opt_in: boolean;
  product_updates_updated_at: string | null;
  product_updates_source: CommunicationPreferences["productUpdatesSource"];
};

type PreferenceEventRow = {
  id: string;
  preference_key: "product_updates";
  previous_value: boolean | null;
  new_value: boolean;
  source: CommunicationPreferences["productUpdatesSource"];
  lawful_basis_note: string;
  created_at: string;
};

export async function getCommunicationPreferences(userId: string): Promise<CommunicationPreferences> {
  const sql = getDatabase();
  await sql`
    INSERT INTO communication_preferences (user_id, product_updates_opt_in, product_updates_source)
    VALUES (${userId}, FALSE, 'member_default')
    ON CONFLICT (user_id) DO NOTHING
  `;

  const [preferenceRows, eventRows] = await Promise.all([
    sql`
      SELECT product_updates_opt_in, product_updates_updated_at, product_updates_source
      FROM communication_preferences
      WHERE user_id = ${userId}
      LIMIT 1
    ` as unknown as Promise<PreferenceRow[]>,
    sql`
      SELECT id, preference_key, previous_value, new_value, source, lawful_basis_note, created_at
      FROM communication_preference_events
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 20
    ` as unknown as Promise<PreferenceEventRow[]>,
  ]);

  const current = preferenceRows[0] ?? {
    product_updates_opt_in: false,
    product_updates_updated_at: null,
    product_updates_source: "member_default" as const,
  };

  return {
    serviceEmails: true,
    safetyEmails: true,
    productUpdatesOptIn: current.product_updates_opt_in,
    productUpdatesUpdatedAt: current.product_updates_updated_at,
    productUpdatesSource: current.product_updates_source,
    consentHistory: eventRows.map((row) => ({
      id: row.id,
      preferenceKey: row.preference_key,
      previousValue: row.previous_value,
      newValue: row.new_value,
      source: row.source,
      lawfulBasisNote: row.lawful_basis_note,
      createdAt: row.created_at,
    })),
  };
}

export async function updateProductUpdatesPreference(userId: string, enabled: boolean): Promise<CommunicationPreferences> {
  const sql = getDatabase();
  await sql.transaction([
    sql`
      INSERT INTO communication_preferences (user_id, product_updates_opt_in, product_updates_source)
      VALUES (${userId}, FALSE, 'member_default')
      ON CONFLICT (user_id) DO NOTHING
    `,
    sql`
      WITH current_preference AS (
        SELECT product_updates_opt_in
        FROM communication_preferences
        WHERE user_id = ${userId}
      ), updated_preference AS (
        UPDATE communication_preferences
        SET product_updates_opt_in = ${enabled},
            product_updates_updated_at = NOW(),
            product_updates_source = 'member_profile'
        WHERE user_id = ${userId}
          AND EXISTS (SELECT 1 FROM current_preference WHERE product_updates_opt_in IS DISTINCT FROM ${enabled})
        RETURNING (SELECT product_updates_opt_in FROM current_preference LIMIT 1) AS previous_value,
                  product_updates_opt_in AS new_value
      )
      INSERT INTO communication_preference_events (
        id, user_id, preference_key, previous_value, new_value, source, lawful_basis_note
      )
      SELECT
        ${crypto.randomUUID()}::uuid,
        ${userId},
        'product_updates',
        previous_value,
        new_value,
        'member_profile',
        'Optional product and launch update preference recorded from the member profile.'
      FROM updated_preference
    `,
  ]);

  return getCommunicationPreferences(userId);
}
