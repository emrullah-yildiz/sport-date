// Aggregate read-out for the self-hosted research survey (CX-20260704).
// Owner/agent analysis tool — nothing here is public.
//
//   node --env-file-if-exists=../../.env scripts/research-aggregates.mjs
//   node ... research-aggregates.mjs --free-text       # include free-text answers
//   node ... research-aggregates.mjs --contacts        # list contacts (scheduling only)
//
// Analysis rules from the kit (docs/marketing/member-survey-and-forum-kit.md):
// report distributions, suppress small demographic slices, never combine these
// answers with any claim of demand or traction, and treat willingness-to-pay
// answers as DIRECTIONAL only — never pricing evidence.

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL / NEON_DATABASE_URL is not set.");
  process.exit(1);
}
const sql = neon(databaseUrl);

const showFreeText = process.argv.includes("--free-text");
const showContacts = process.argv.includes("--contacts");

const CHOICE_QUESTIONS = [
  ["q1", "single"], ["q2", "multi"], ["q5", "single"], ["q8_age", "single"],
  ["q10", "multi"], ["q12", "single"], ["q13", "single"],
];
const TEXT_QUESTIONS = ["q2_other", "q3", "q4", "q6", "q8_area", "q10_other", "q12_depends", "q14", "q15"];

const rows = await sql`
  SELECT answers, extended_answers, created_at FROM research_responses ORDER BY created_at ASC
`;

const merged = rows.map((row) => ({ ...(row.answers ?? {}), ...(row.extended_answers ?? {}) }));

console.log(`Responses: ${rows.length} total, ${rows.filter((row) => row.extended_answers).length} with the Survey 2 extension.`);
if (rows.length > 0) {
  console.log(`First: ${rows[0].created_at} — latest: ${rows[rows.length - 1].created_at}`);
}

for (const [id, kind] of CHOICE_QUESTIONS) {
  const counts = new Map();
  let answered = 0;
  for (const answers of merged) {
    const value = answers[id];
    if (value == null) continue;
    answered += 1;
    for (const option of kind === "multi" ? (Array.isArray(value) ? value : []) : [value]) {
      counts.set(option, (counts.get(option) ?? 0) + 1);
    }
  }
  console.log(`\n${id} (${answered} answered):`);
  for (const [option, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${option}`);
  }
}

// Q11 ratings: mean per factor (directional only).
const ratingTotals = new Map();
for (const answers of merged) {
  const ratings = answers.q11;
  if (!ratings || typeof ratings !== "object") continue;
  for (const [factor, rating] of Object.entries(ratings)) {
    const entry = ratingTotals.get(factor) ?? { sum: 0, count: 0 };
    entry.sum += Number(rating);
    entry.count += 1;
    ratingTotals.set(factor, entry);
  }
}
if (ratingTotals.size > 0) {
  console.log("\nq11 — mean importance (1-5), directional only:");
  for (const [factor, { sum, count }] of [...ratingTotals.entries()].sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)) {
    console.log(`  ${(sum / count).toFixed(2)} (${count})  ${factor}`);
  }
}

console.log("\nFree-text answer counts:");
for (const id of TEXT_QUESTIONS) {
  const texts = merged.map((answers) => answers[id]).filter((value) => typeof value === "string" && value.trim());
  console.log(`  ${String(texts.length).padStart(4)}  ${id}`);
  if (showFreeText) {
    for (const text of texts) console.log(`        - ${text}`);
  }
}

const contactCountRows = await sql`SELECT COUNT(*)::integer AS count FROM research_contacts`;
console.log(`\nResearch-conversation contacts (consented, stored separately): ${contactCountRows[0].count}`);
if (showContacts) {
  const contacts = await sql`SELECT contact, created_at FROM research_contacts ORDER BY created_at ASC`;
  for (const row of contacts) console.log(`  ${row.created_at}  ${row.contact}`);
  console.log("Reminder: contacts are for scheduling the study only — delete once scheduled/complete.");
}

console.log("\nReminder: WTP answers are directional, never pricing evidence or traction.");
