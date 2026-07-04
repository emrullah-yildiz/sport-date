import "server-only";

import { getDatabase } from "@/lib/db";

// Social content approval queue data layer
// (CX-20260705-social-content-approval-queue). The growth agent seeds ideas via
// the internal secret path; the owner lists + decides via the owner-gated API.
// Internal marketing content only — no member PII.

export const SOCIAL_PLATFORMS = ["instagram", "tiktok", "both"] as const;
export const SOCIAL_FORMATS = ["carousel", "reel", "image", "story"] as const;
export const SOCIAL_STATUSES = ["pending", "approved", "denied"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialFormat = (typeof SOCIAL_FORMATS)[number];
export type SocialIdeaStatus = (typeof SOCIAL_STATUSES)[number];

export type SocialIdeaBody = Readonly<{
  slides?: string[];
  script?: string;
  caption: string;
  hashtags: string[];
  cta: string;
  imageConcept: string;
}>;

export type SocialIdea = Readonly<{
  id: string;
  platform: SocialPlatform;
  format: SocialFormat;
  title: string;
  trend: string | null;
  hook: string;
  body: SocialIdeaBody;
  status: SocialIdeaStatus;
  ownerComment: string | null;
  createdAt: string;
  decidedAt: string | null;
  scheduledRef: string | null;
}>;

export type SocialIdeaInput = Readonly<{
  platform: SocialPlatform;
  format: SocialFormat;
  title: string;
  trend: string | null;
  hook: string;
  body: SocialIdeaBody;
}>;

export type SocialIdeaDecision = Readonly<{
  action?: "approve" | "deny";
  comment?: string;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSocialIdeaId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

type SocialIdeaRow = {
  id: string;
  platform: SocialPlatform;
  format: SocialFormat;
  title: string;
  trend: string | null;
  hook: string;
  body: SocialIdeaBody | string;
  status: SocialIdeaStatus;
  owner_comment: string | null;
  created_at: string | Date;
  decided_at: string | Date | null;
  scheduled_ref: string | null;
};

function toIso(value: string | Date | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : String(value);
}

function mapIdea(row: SocialIdeaRow): SocialIdea {
  // Neon returns jsonb as a parsed object, but be defensive if it arrives as text.
  const body = typeof row.body === "string" ? (JSON.parse(row.body) as SocialIdeaBody) : row.body;
  return {
    id: row.id,
    platform: row.platform,
    format: row.format,
    title: row.title,
    trend: row.trend,
    hook: row.hook,
    body,
    status: row.status,
    ownerComment: row.owner_comment,
    createdAt: toIso(row.created_at) as string,
    decidedAt: toIso(row.decided_at),
    scheduledRef: row.scheduled_ref,
  };
}

// ── Validation for the internal seed path ────────────────────────────────────

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    out.push(item);
  }
  return out;
}

/**
 * Validate + normalise a single raw idea from the seed payload. Returns the
 * clean input, or a string error describing the first problem. Enforces the
 * enum + required-field contract so a bad agent payload can never insert junk.
 */
export function normalizeSocialIdeaInput(raw: unknown): SocialIdeaInput | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "Each idea must be an object." };
  const value = raw as Record<string, unknown>;

  const platform = value.platform;
  if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
    return { error: `platform must be one of ${SOCIAL_PLATFORMS.join(", ")}.` };
  }
  const format = value.format;
  if (!SOCIAL_FORMATS.includes(format as SocialFormat)) {
    return { error: `format must be one of ${SOCIAL_FORMATS.join(", ")}.` };
  }
  const title = asTrimmedString(value.title);
  if (!title) return { error: "title is required." };
  const hook = asTrimmedString(value.hook);
  if (!hook) return { error: "hook is required." };
  const trend = asTrimmedString(value.trend);

  const rawBody = value.body;
  if (typeof rawBody !== "object" || rawBody === null) return { error: "body is required." };
  const bodyValue = rawBody as Record<string, unknown>;

  const caption = asTrimmedString(bodyValue.caption);
  if (!caption) return { error: "body.caption is required." };
  const cta = asTrimmedString(bodyValue.cta);
  if (!cta) return { error: "body.cta is required." };
  const imageConcept = asTrimmedString(bodyValue.imageConcept);
  if (!imageConcept) return { error: "body.imageConcept is required." };
  const hashtags = asStringArray(bodyValue.hashtags);
  if (!hashtags) return { error: "body.hashtags must be an array of strings." };

  const body: SocialIdeaBody = { caption, hashtags, cta, imageConcept };
  const withSlides: SocialIdeaBody = bodyValue.slides !== undefined
    ? { ...body, slides: asStringArray(bodyValue.slides) ?? undefined }
    : body;
  if (bodyValue.slides !== undefined && withSlides.slides === undefined) {
    return { error: "body.slides must be an array of strings." };
  }
  const script = asTrimmedString(bodyValue.script);
  const finalBody: SocialIdeaBody = script ? { ...withSlides, script } : withSlides;

  return { platform: platform as SocialPlatform, format: format as SocialFormat, title, trend, hook, body: finalBody };
}

// ── DB operations ────────────────────────────────────────────────────────────

/** Owner-gated: list ideas newest-first, optionally filtered by status. */
export async function listSocialIdeas(status?: SocialIdeaStatus): Promise<SocialIdea[]> {
  const sql = getDatabase();
  const rows = (status
    ? await sql`
        SELECT id, platform, format, title, trend, hook, body, status,
          owner_comment, created_at, decided_at, scheduled_ref
        FROM social_content_ideas
        WHERE status = ${status}
        ORDER BY created_at DESC, id DESC
        LIMIT 500`
    : await sql`
        SELECT id, platform, format, title, trend, hook, body, status,
          owner_comment, created_at, decided_at, scheduled_ref
        FROM social_content_ideas
        ORDER BY created_at DESC, id DESC
        LIMIT 500`) as unknown as SocialIdeaRow[];
  return rows.map(mapIdea);
}

/** Internal seed: insert a batch of validated ideas with status='pending'. */
export async function insertSocialIdeas(inputs: readonly SocialIdeaInput[]): Promise<SocialIdea[]> {
  const sql = getDatabase();
  const created: SocialIdea[] = [];
  for (const input of inputs) {
    const rows = (await sql`
      INSERT INTO social_content_ideas (platform, format, title, trend, hook, body)
      VALUES (
        ${input.platform}, ${input.format}, ${input.title}, ${input.trend},
        ${input.hook}, ${JSON.stringify(input.body)}::jsonb
      )
      RETURNING id, platform, format, title, trend, hook, body, status,
        owner_comment, created_at, decided_at, scheduled_ref
    `) as unknown as SocialIdeaRow[];
    created.push(mapIdea(rows[0]));
  }
  return created;
}

/**
 * Owner decision on an idea: approve/deny (sets status + decided_at) and/or a
 * comment. A comment with no action updates owner_comment only, leaving status
 * untouched. Returns the updated idea, or null when the id is unknown.
 */
export async function decideSocialIdea(id: string, decision: SocialIdeaDecision): Promise<SocialIdea | null> {
  if (!isValidSocialIdeaId(id)) return null;
  const sql = getDatabase();

  const nextStatus = decision.action === "approve" ? "approved" : decision.action === "deny" ? "denied" : null;
  const hasComment = decision.comment !== undefined;
  const comment = hasComment ? (decision.comment ?? "") : null;

  const rows = (await sql`
    UPDATE social_content_ideas
    SET
      status = COALESCE(${nextStatus}, status),
      decided_at = CASE WHEN ${nextStatus}::text IS NULL THEN decided_at ELSE NOW() END,
      owner_comment = CASE WHEN ${hasComment} THEN ${comment} ELSE owner_comment END
    WHERE id = ${id}::uuid
    RETURNING id, platform, format, title, trend, hook, body, status,
      owner_comment, created_at, decided_at, scheduled_ref
  `) as unknown as SocialIdeaRow[];
  const row = rows[0];
  return row ? mapIdea(row) : null;
}

export function isSocialIdeaStatus(value: unknown): value is SocialIdeaStatus {
  return typeof value === "string" && SOCIAL_STATUSES.includes(value as SocialIdeaStatus);
}
