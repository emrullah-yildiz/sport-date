import { NextResponse } from "next/server";

import { enforceRateLimit, researchSurveyRateLimitRules } from "@/lib/rate-limit";
import { createResearchContact, createResearchResponse, extendResearchResponse } from "@/lib/research-responses";
import {
  sanitizeResearchContact,
  sanitizeSurveyOneAnswers,
  sanitizeSurveyTwoAnswers,
} from "@/lib/research-survey";
import { isTrustedBrowserMutation } from "@/lib/request-security";

// Public, anonymous research-survey write endpoint (CX-20260704). No auth, no
// cookies, no identity: the only inputs accepted are the sanitized answer sets
// and (separately, consent-gated) the optional contact handle. The rate limiter
// hashes the caller's IP into a transient counter; the IP is never stored in
// any research row.

const privateHeaders = { "Cache-Control": "no-store" };

type ResearchAction =
  | { action: "answers"; answers?: unknown }
  | { action: "extend"; responseId?: unknown; answers?: unknown }
  | { action: "contact"; contact?: unknown; consent?: unknown };

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403, headers: privateHeaders });
  }

  const limited = await enforceRateLimit(
    "research-survey",
    researchSurveyRateLimitRules(request),
    "You have submitted a lot recently. Please try again a little later.",
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: privateHeaders });
  }
  const payload = (body && typeof body === "object" ? body : {}) as ResearchAction;

  if (payload.action === "answers") {
    const answers = sanitizeSurveyOneAnswers(payload.answers ?? {});
    if (answers === null) {
      return NextResponse.json({ error: "Malformed answers." }, { status: 400, headers: privateHeaders });
    }
    const responseId = await createResearchResponse(answers);
    return NextResponse.json({ responseId }, { status: 201, headers: privateHeaders });
  }

  if (payload.action === "extend") {
    const answers = sanitizeSurveyTwoAnswers(payload.answers ?? {});
    if (answers === null || typeof payload.responseId !== "string") {
      return NextResponse.json({ error: "Malformed answers." }, { status: 400, headers: privateHeaders });
    }
    const extended = await extendResearchResponse(payload.responseId, answers);
    if (!extended) {
      return NextResponse.json({ error: "This response cannot be extended." }, { status: 404, headers: privateHeaders });
    }
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  }

  if (payload.action === "contact") {
    // Consent is the gate, not a formality: without the explicit checkbox the
    // contact is refused and nothing is stored anywhere.
    if (payload.consent !== true) {
      return NextResponse.json(
        { error: "Contact can only be stored with your explicit consent." },
        { status: 400, headers: privateHeaders },
      );
    }
    const contact = sanitizeResearchContact(payload.contact);
    if (!contact) {
      return NextResponse.json({ error: "Enter a contact we can reach you on (3–200 characters)." }, { status: 400, headers: privateHeaders });
    }
    // Deliberately no response id: contact rows are unlinkable to answers.
    await createResearchContact(contact);
    return NextResponse.json({ ok: true }, { status: 201, headers: privateHeaders });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400, headers: privateHeaders });
}
