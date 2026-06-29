import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type AccountExportRow = {
  id: string | number;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  location: string;
  timezone: string;
  bio: string;
  languages: string[];
  seeking: string;
  email_verified: boolean;
  accepted_terms_at: string;
  created_at: string;
  updated_at: string;
  sports: Array<{ name: string; skillLevel: string; frequency: string }>;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const sql = getDatabase();
  const rows = await sql`
    SELECT
      users.id, users.email, users.first_name, users.last_name, users.date_of_birth,
      users.location, users.timezone, users.bio, users.languages, users.seeking,
      users.email_verified, users.accepted_terms_at, users.created_at, users.updated_at,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'name', user_sports.sport,
            'skillLevel', user_sports.skill_level,
            'frequency', user_sports.frequency
          ) ORDER BY user_sports.created_at
        ) FILTER (WHERE user_sports.id IS NOT NULL),
        '[]'::jsonb
      ) AS sports
    FROM users
    LEFT JOIN user_sports ON user_sports.user_id = users.id
    WHERE users.id = ${user.id} AND users.account_status = 'active'
    GROUP BY users.id
  ` as unknown as AccountExportRow[];

  const account = rows[0];
  if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const hostedEvents = await sql`
    SELECT events.id, events.sport, events.title, events.description, events.starts_at,
      events.time_zone, events.duration_minutes, events.capacity, events.language,
      events.minimum_age, events.maximum_age, events.experience_levels, events.status,
      events.public_city, events.public_country_code, events.public_area_label,
      private_location.venue_name, private_location.address, private_location.arrival_instructions,
      events.created_at, events.updated_at
    FROM events
    JOIN event_private_locations AS private_location ON private_location.event_id = events.id
    WHERE events.host_user_id = ${user.id}
    ORDER BY events.created_at
  `;
  const joinRequests = await sql`
    SELECT request.id, request.event_id, request.status, request.skip_count, request.introduction,
      request.requested_at, request.responded_at, request.cancelled_at,
      events.title AS event_title, events.sport, events.starts_at,
      events.public_city, events.public_area_label,
      participant.seat_number, private_location.venue_name, private_location.address,
      private_location.arrival_instructions
    FROM join_requests AS request
    JOIN events ON events.id = request.event_id
    LEFT JOIN event_participants AS participant
      ON participant.event_id = request.event_id AND participant.user_id = request.requester_user_id
    LEFT JOIN event_private_locations AS private_location
      ON private_location.event_id = participant.event_id
    WHERE request.requester_user_id = ${user.id}
    ORDER BY request.requested_at
  `;
  const safetyReports = await sql`
    SELECT id, reported_user_id, event_id, category, details, status, priority,
      decision_code, decision_summary, decided_at, appeal_deadline, created_at, updated_at
    FROM safety_reports WHERE reporter_user_id = ${user.id} ORDER BY created_at
  `;
  const safetyAppeals = await sql`
    SELECT appeal.id, appeal.report_id, appeal.reason, appeal.status, appeal.outcome_summary,
      appeal.created_at, appeal.decided_at
    FROM moderation_appeals AS appeal
    JOIN safety_reports AS report ON report.id = appeal.report_id
    WHERE appeal.appellant_user_id = ${user.id} AND report.reporter_user_id = ${user.id}
    ORDER BY appeal.created_at
  `;
  const blocks = await sql`
    SELECT blocked_user_id, created_at FROM user_blocks
    WHERE blocker_user_id = ${user.id} ORDER BY created_at
  `;

  await sql`
    INSERT INTO data_requests (id, user_id, request_type, status, completed_at)
    VALUES (${crypto.randomUUID()}::uuid, ${user.id}, 'access_export', 'completed', NOW())
  `;

  const body = {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    account: {
      id: String(account.id),
      email: account.email,
      firstName: account.first_name,
      lastName: account.last_name,
      dateOfBirth: account.date_of_birth,
      approximateLocation: account.location,
      timezone: account.timezone,
      bio: account.bio,
      languages: account.languages,
      seeking: account.seeking,
      emailVerified: account.email_verified,
      acceptedTermsAt: account.accepted_terms_at,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
      sports: account.sports,
    },
    hostedEvents,
    joinRequestsAndAcceptedParticipation: joinRequests,
    safetyReportsSubmitted: safetyReports,
    safetyAppealsSubmitted: safetyAppeals,
    memberBlocksCreated: blocks,
    excludedSecurityData: ["password hash", "session tokens and hashes"],
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="sport-date-account-${user.id}.json"`,
    },
  });
}
