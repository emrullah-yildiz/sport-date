"use client";

import type { ExperienceLevel } from "@sport-date/domain";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";

import AddressAutocomplete from "@/components/AddressAutocomplete";

import {
  datetimeLocalMin,
  EVENT_FIELD_ORDER,
  eventFieldLabel,
  experienceLevelsIssue,
  isPastLocalDateTime,
  issuesFromServerErrors,
  PAST_START_TIME_MESSAGE,
  requiredFieldsHeadline,
  REQUIRED_FIELDS_SUMMARY_MESSAGE,
  sectionProgressLabel,
  sectionsNeedingAttention,
  type EventFieldIssue,
  type EventFieldName,
} from "@/lib/event-create-recovery";

const levels: Array<{ value: ExperienceLevel; label: string }> = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

type SummaryKind = "empty-required" | "server" | "";

export default function CreateEventForm() {
  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>(["beginner", "intermediate"]);
  const [countryCode, setCountryCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Every problem to show at once — tied to a field where one exists — so the
  // host fixes them in one calm pass instead of one-per-round-trip.
  const [issues, setIssues] = useState<EventFieldIssue[]>([]);
  const [summaryKind, setSummaryKind] = useState<SummaryKind>("");

  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // `min` only exists to stop a clearly-past time from being picked; the server
  // stays the authoritative check. `datetimeLocalMin()` reads the wall clock, so
  // evaluating it during SSR and again at hydration can yield a different minute
  // (or timezone) and makes React log a hydration-mismatch on every host visit.
  // Resolve it as a client-only value: the server snapshot is empty (no floor),
  // so server and first client render agree, then the browser fills in the floor.
  const startMin = useSyncExternalStore(
    () => () => {},
    () => datetimeLocalMin(),
    () => "",
  );

  const invalidFields = useMemo(() => {
    const set = new Set<EventFieldName>();
    for (const issue of issues) {
      if (issue.field) set.add(issue.field);
    }
    return set;
  }, [issues]);

  // Which sections still have a flagged field, so the progress rail can quietly
  // point the host at what remains. Informative only — never a submit blocker.
  const attentionSections = useMemo(
    () => new Set(sectionsNeedingAttention(issues)),
    [issues],
  );

  function describedBy(field: EventFieldName): string | undefined {
    return invalidFields.has(field) ? `${field}-error` : undefined;
  }

  function fieldMessage(field: EventFieldName): string | undefined {
    return issues.find((issue) => issue.field === field)?.message;
  }

  function fieldProps(field: EventFieldName) {
    return {
      id: field,
      name: field,
      "aria-invalid": invalidFields.has(field) || undefined,
      "aria-describedby": describedBy(field),
    } as const;
  }

  function toggleLevel(level: ExperienceLevel) {
    setExperienceLevels((current) => current.includes(level) ? current.filter((item) => item !== level) : [...current, level]);
  }

  function focusFirstIssue(nextIssues: EventFieldIssue[]) {
    const form = formRef.current;
    const firstField = nextIssues.find((issue) => issue.field)?.field ?? null;
    // Prefer moving the host to the actual field to fix; fall back to the
    // summary so a form-wide problem is still surfaced in view.
    const target = (firstField && form?.querySelector<HTMLElement>(`[name="${firstField}"]`)) || summaryRef.current;
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.focus({ preventScroll: true });
    });
  }

  function reportEmptyRequired(): boolean {
    const form = formRef.current;
    if (!form) return false;
    // Collect every currently-blocked field, in page order, as its own issue so
    // the host sees the full list rather than the native one-bubble-at-a-time.
    const emptyIssues: EventFieldIssue[] = [];
    let kind: SummaryKind = "empty-required";
    if (form.checkValidity()) {
      // Still guard the client-side past-time rule even when everything is
      // "filled" — the native `min` catches most, this catches an edited value.
      const startInput = form.elements.namedItem("startsAt");
      const startValue = startInput instanceof HTMLInputElement ? startInput.value : "";
      if (isPastLocalDateTime(startValue)) {
        emptyIssues.push({ field: "startsAt", message: PAST_START_TIME_MESSAGE });
        kind = "server";
      }
      // Experience levels sit after startsAt in page order, so append here.
      const levelIssue = experienceLevelsIssue(experienceLevels.length);
      if (levelIssue) emptyIssues.push(levelIssue);
    } else {
      for (const field of EVENT_FIELD_ORDER) {
        // Experience levels are React-state checkboxes with no native `required`,
        // so the browser can't flag an empty set — check it explicitly, in its
        // canonical page position, so it joins the same recovery summary as
        // every other required detail instead of a silent, unexplained disable.
        if (field === "experienceLevels") {
          const levelIssue = experienceLevelsIssue(experienceLevels.length);
          if (levelIssue) emptyIssues.push(levelIssue);
          continue;
        }
        const element = form.elements.namedItem(field);
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          if (!element.checkValidity()) {
            const past = field === "startsAt" && isPastLocalDateTime(element.value);
            emptyIssues.push({
              field,
              message: past ? PAST_START_TIME_MESSAGE : `${eventFieldLabel(field)} is required.`,
            });
          }
        }
      }
    }
    if (emptyIssues.length === 0) return false;
    setIssues(emptyIssues);
    setSummaryKind(kind);
    focusFirstIssue(emptyIssues);
    return true;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIssues([]);
    setSummaryKind("");

    // Client-side prevention/visibility first: if native `required` or the
    // past-time rule would block us, show a VISIBLE summary + move focus instead
    // of letting the browser silently jump to a hidden bubble.
    if (reportEmptyRequired()) return;

    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const localStart = String(form.get("startsAt"));
      const startsAt = new Date(localStart);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (Number.isNaN(startsAt.getTime())) throw new Error("Choose a valid start time.");
      const payload = {
        sport: form.get("sport"), title: form.get("title"), description: form.get("description"),
        startsAt: startsAt.toISOString(), timeZone, durationMinutes: form.get("durationMinutes"),
        capacity: form.get("capacity"), language: form.get("language"), experienceLevels,
        participantAgeRange: { minimum: form.get("minimumAge"), maximum: form.get("maximumAge") },
        location: {
          public: { city: form.get("city"), countryCode: form.get("countryCode"), areaLabel: form.get("areaLabel"), approximateLatitude: null, approximateLongitude: null },
          private: { venueName: form.get("venueName"), address: form.get("address"), postalCode: form.get("postalCode"), instructions: form.get("instructions"), latitude: form.get("latitude") ? Number(form.get("latitude")) : null, longitude: form.get("longitude") ? Number(form.get("longitude")) : null },
        },
      };
      const response = await fetch("/api/events", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        // Surface EVERY server problem at once (not just errors[0]), each tied to
        // its field, and move the host to the first one.
        const serverErrors: string[] = Array.isArray(result.errors) && result.errors.length > 0
          ? result.errors
          : [result.error || "Event creation failed."];
        const serverIssues = issuesFromServerErrors(serverErrors);
        setIssues(serverIssues);
        setSummaryKind("server");
        setSubmitting(false);
        focusFirstIssue(serverIssues);
        return;
      }
      window.location.assign(`/events/${result.eventId}?published=1`);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Event creation failed.";
      const fallbackIssues = issuesFromServerErrors([message]);
      setIssues(fallbackIssues);
      setSummaryKind("server");
      setSubmitting(false);
      focusFirstIssue(fallbackIssues);
    }
  }

  const summaryHeadline =
    summaryKind === "empty-required" ? REQUIRED_FIELDS_SUMMARY_MESSAGE : "Please fix the following to publish:";

  // The reason Publish is blocked when no experience level is chosen — shown the
  // moment the selection empties (not only after a submit round-trip), and
  // cleared the moment a level is re-checked. Prefers a submit/server message for
  // the field if one exists so the inline text never contradicts the summary.
  const experienceLevelsError =
    fieldMessage("experienceLevels") ?? experienceLevelsIssue(experienceLevels.length)?.message;

  return (
    <form className="event-form" onSubmit={submit} noValidate ref={formRef}>
      {issues.length > 0 ? (
        <div className="event-form-summary" role="alert" aria-live="assertive" tabIndex={-1} ref={summaryRef}>
          <p className="event-form-summary-headline">{summaryHeadline}</p>
          {summaryKind === "empty-required" ? (
            <p className="event-form-summary-count">{requiredFieldsHeadline(issues.length)}</p>
          ) : null}
          <ul className="event-form-summary-list">
            {issues.map((issue, index) => (
              <li key={`${issue.field ?? "form"}-${index}`}>
                {issue.field ? (
                  <a
                    href={`#${issue.field}`}
                    onClick={(clickEvent) => {
                      clickEvent.preventDefault();
                      focusFirstIssue([issue]);
                    }}
                  >
                    {issue.message}
                  </a>
                ) : (
                  issue.message
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="event-form-standard" role="note">
        A quick standard: events are for a real shared activity — dating, friendship, or community
        through the game. Events organised for sexual purposes or hookups aren&rsquo;t allowed. See the{" "}
        <a href="/hosting-guidelines">hosting guidelines</a>.
      </p>

      <nav className="event-form-progress" aria-label="Event details progress">
        <p className="event-form-progress-lede">Three calm sections. One publish at the end—your details are kept as you go.</p>
        <ol className="event-form-progress-rail">
          <li className={`event-form-progress-step${attentionSections.has("invitation") ? " needs-attention" : ""}`}>
            <a href="#section-invitation"><span className="event-form-progress-num" aria-hidden="true">1</span><span className="event-form-progress-name">The invitation</span>{attentionSections.has("invitation") ? <span className="event-form-progress-flag"> — needs attention</span> : null}</a>
          </li>
          <li className={`event-form-progress-step${attentionSections.has("rhythm") ? " needs-attention" : ""}`}>
            <a href="#section-rhythm"><span className="event-form-progress-num" aria-hidden="true">2</span><span className="event-form-progress-name">The rhythm</span>{attentionSections.has("rhythm") ? <span className="event-form-progress-flag"> — needs attention</span> : null}</a>
          </li>
          <li className={`event-form-progress-step${attentionSections.has("location") ? " needs-attention" : ""}`}>
            <a href="#section-location"><span className="event-form-progress-num" aria-hidden="true">3</span><span className="event-form-progress-name">Where you&apos;ll meet</span>{attentionSections.has("location") ? <span className="event-form-progress-flag"> — needs attention</span> : null}</a>
          </li>
        </ol>
      </nav>

      <section className="event-form-section" id="section-invitation" aria-labelledby="section-invitation-heading">
        <p className="event-form-step-indicator">{sectionProgressLabel(0)}</p>
        <p className="panel-label">The invitation</p>
        <h2 id="section-invitation-heading">Give people a reason to picture themselves there.</h2>
        <div className="event-field-grid">
          <label htmlFor="sport">Sport<input {...fieldProps("sport")} required maxLength={60} placeholder="Tennis" />{fieldMessage("sport") ? <span id="sport-error" className="field-error">{fieldMessage("sport")}</span> : null}</label>
          <label htmlFor="title">Event name<input {...fieldProps("title")} required maxLength={100} placeholder="An easy evening rally" />{fieldMessage("title") ? <span id="title-error" className="field-error">{fieldMessage("title")}</span> : null}</label>
        </div>
        <label htmlFor="description">Description<textarea {...fieldProps("description")} required minLength={20} maxLength={1000} rows={5} placeholder="Set the pace, mood, and what a newcomer should expect." />{fieldMessage("description") ? <span id="description-error" className="field-error">{fieldMessage("description")}</span> : null}</label>
      </section>

      <section className="event-form-section" id="section-rhythm" aria-labelledby="section-rhythm-heading">
        <p className="event-form-step-indicator">{sectionProgressLabel(1)}</p>
        <p className="panel-label">The rhythm</p>
        <h2 id="section-rhythm-heading">Make the commitment easy to understand.</h2>
        <div className="event-field-grid"><label htmlFor="startsAt">Starts at<input {...fieldProps("startsAt")} type="datetime-local" min={startMin} required /><span className="field-format-hint">Date order follows your browser&apos;s region.</span>{fieldMessage("startsAt") ? <span id="startsAt-error" className="field-error">{fieldMessage("startsAt")}</span> : null}</label><label htmlFor="durationMinutes">Duration in minutes<input {...fieldProps("durationMinutes")} type="number" min="15" max="480" defaultValue="90" required />{fieldMessage("durationMinutes") ? <span id="durationMinutes-error" className="field-error">{fieldMessage("durationMinutes")}</span> : null}</label><label htmlFor="capacity">Places for others<input {...fieldProps("capacity")} type="number" min="2" max="20" defaultValue="4" required aria-describedby="capacity-hint" /><span id="capacity-hint" className="field-format-hint">You&apos;re already in as host — this is how many others can join, not counting you.</span>{fieldMessage("capacity") ? <span id="capacity-error" className="field-error">{fieldMessage("capacity")}</span> : null}</label><label htmlFor="language">Event language<input {...fieldProps("language")} maxLength={35} placeholder="English" required />{fieldMessage("language") ? <span id="language-error" className="field-error">{fieldMessage("language")}</span> : null}</label></div>
        <p className="field-help">The event time zone is captured from your device when you publish.</p>
        <fieldset aria-invalid={experienceLevelsError ? true : undefined} aria-describedby={experienceLevelsError ? "experienceLevels-hint experienceLevels-error" : "experienceLevels-hint"}><legend>Experience levels welcome</legend><p id="experienceLevels-hint" className="field-help">Pick at least one — welcome as many levels as you like.</p><div className="choice-row">{levels.map((level) => <label className="choice-pill" key={level.value}><input type="checkbox" checked={experienceLevels.includes(level.value)} onChange={() => toggleLevel(level.value)} />{level.label}</label>)}</div>{experienceLevelsError ? <span id="experienceLevels-error" className="field-error" role="status">{experienceLevelsError}</span> : null}</fieldset>
        <div className="event-field-grid"><label htmlFor="minimumAge">Minimum age<input {...fieldProps("minimumAge")} type="number" min="18" max="100" defaultValue="24" required />{fieldMessage("minimumAge") ? <span id="minimumAge-error" className="field-error">{fieldMessage("minimumAge")}</span> : null}</label><label htmlFor="maximumAge">Maximum age<input {...fieldProps("maximumAge")} type="number" min="18" max="100" defaultValue="38" required />{fieldMessage("maximumAge") ? <span id="maximumAge-error" className="field-error">{fieldMessage("maximumAge")}</span> : null}</label></div>
      </section>

      <section className="event-form-section location-separation" id="section-location" aria-labelledby="section-location-heading">
        <p className="event-form-step-indicator location-step-indicator">{sectionProgressLabel(2)}</p>
        <h2 id="section-location-heading" className="visually-hidden">Where you&apos;ll meet</h2>
        <div className="location-column public-location"><p className="panel-label">Discovery sees</p><h2>An approximate area</h2><p>Enough context to judge the journey. Never the door they should walk through.</p><label htmlFor="city">City<input {...fieldProps("city")} required maxLength={100} />{fieldMessage("city") ? <span id="city-error" className="field-error">{fieldMessage("city")}</span> : null}</label><label htmlFor="countryCode">Country code<input {...fieldProps("countryCode")} value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} required minLength={2} maxLength={2} placeholder="RO" />{fieldMessage("countryCode") ? <span id="countryCode-error" className="field-error">{fieldMessage("countryCode")}</span> : null}</label><label htmlFor="areaLabel">Area or neighborhood<input {...fieldProps("areaLabel")} required maxLength={120} placeholder="Tineretului" />{fieldMessage("areaLabel") ? <span id="areaLabel-error" className="field-error">{fieldMessage("areaLabel")}</span> : null}</label></div>
        <div className="location-column private-location"><p className="panel-label">Accepted people see</p><h2>The precise meeting point</h2><p>Search like an arrival destination, then choose the right result to set its exact pin. It stays private until acceptance.</p><label htmlFor="venueName">Venue name<input {...fieldProps("venueName")} required maxLength={120} placeholder="Court 2" />{fieldMessage("venueName") ? <span id="venueName-error" className="field-error">{fieldMessage("venueName")}</span> : null}</label><AddressAutocomplete countryCode={countryCode} error={fieldMessage("address")} /><label htmlFor="postalCode">Postal code<input {...fieldProps("postalCode")} required maxLength={20} placeholder="010101" />{fieldMessage("postalCode") ? <span id="postalCode-error" className="field-error">{fieldMessage("postalCode")}</span> : null}</label><label htmlFor="instructions">Arrival instructions<textarea {...fieldProps("instructions")} maxLength={500} rows={3} placeholder="Where to enter, who to ask for, and what to bring." />{fieldMessage("instructions") ? <span id="instructions-error" className="field-error">{fieldMessage("instructions")}</span> : null}</label></div>
      </section>

      {issues.length > 0 ? (
        <p className="event-form-action-alert" role="status">
          {summaryKind === "empty-required"
            ? "Some required details above still need attention — we've highlighted them for you."
            : "We couldn't publish yet — see the highlighted problems above."}
        </p>
      ) : null}
      <button className="event-publish" type="submit" disabled={submitting} aria-describedby={experienceLevelsError ? "experienceLevels-error" : undefined}>{submitting ? "Publishing…" : "Publish the invitation"}</button>
      <p className="event-form-note">Publishing makes only the approximate event details discoverable. Exact meeting details remain private.</p>
    </form>
  );
}
