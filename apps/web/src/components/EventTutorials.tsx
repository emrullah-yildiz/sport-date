"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CreateEventForm from "./CreateEventForm";
import JoinRequestControls from "./JoinRequestControls";
import styles from "./EventTutorials.module.css";

const hostHints = [
  ["Start with the activity", "Give your plan a name and tell people what to expect. Try editing this invitation, then continue."],
  ["Make time for it", "Choose when you are free and how long you want to play. This is how others find a plan that fits their day."],
  ["Picture your group", "Choose the number of places, language and experience levels. Your own place as host is already included."],
  ["Choose where to meet", "Try searching for Riverside and choose the example result. People browsing see the area; only accepted guests get the meeting details."],
  ["You have the final say", "Check your invitation and edit any step. In the real flow, this final button publishes your plan for people to discover."],
];
const joinHints = {
  note: ["A little hello, if you like", "When a plan fits your free time, request a place. Add a note or go straight to review."],
  review: ["Check before you send", "Your note is still editable. In the real flow, Send request asks the host for a place."],
  pending: ["The host takes it from here", "This is the waiting state. A request is not an accepted place: the exact meeting point appears only after the host accepts you."],
  cancelled: ["Plans can change", "You can cancel quietly. If there is still room, you can ask again."],
};

export default function EventTutorials({ onClose }: { onClose: () => void }) {
  const [journey, setJourney] = useState<"host" | "join" | null>(null);
  const [hostStep, setHostStep] = useState(0);
  const [joinStep, setJoinStep] = useState<keyof typeof joinHints>("note");
  const [complete, setComplete] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const coachRef = useRef<HTMLElement>(null);
  const [startsAt] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(18, 0, 0, 0);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  });
  const hostTutorial = useMemo(() => ({ startsAt, onStepChange: setHostStep, onComplete: () => setComplete(true) }), [startsAt]);
  const joinTutorial = useMemo(() => ({ onStepChange: setJoinStep }), []);
  useEffect(() => { headingRef.current?.focus(); }, [journey, complete]);
  useEffect(() => {
    if (journey) coachRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [journey, hostStep, joinStep]);
  const hint = journey === "host" ? hostHints[hostStep] : joinHints[joinStep];

  function choose(next: "host" | "join" | null) {
    setHostStep(0);
    setJoinStep("note");
    setComplete(false);
    setJourney(next);
  }

  return <section className={styles.tutorial} aria-labelledby="tutorial-heading">
    <div className={styles.toolbar}>
      {journey ? <button type="button" onClick={() => choose(null)}>Back to tutorials</button> : <span>Try it at your pace</span>}
      <button type="button" onClick={onClose}>Close tutorial</button>
    </div>
    <h2 id="tutorial-heading" ref={headingRef} tabIndex={-1}>{complete ? "Your invitation is ready" : journey === "host" ? "Host an event" : journey === "join" ? "Join an event" : "Which side would you like to try?"}</h2>
    <p className={styles.disclosure}>Practice walkthrough. Nothing is published or sent.</p>
    {!journey ? <div className={styles.choices}>
      <button type="button" onClick={() => choose("host")}><span aria-hidden="true">↗</span><strong>Host an event</strong><small>Turn your free time into a plan.</small></button>
      <button type="button" onClick={() => choose("join")}><span aria-hidden="true">↘</span><strong>Join an event</strong><small>Find your people around an activity.</small></button>
    </div> : complete ? <div className={styles.completion}>
      <p>In the real flow, people can now discover the invitation and request a place. You review requests and choose who joins.</p>
      <button type="button" onClick={() => choose("join")}>Try joining an event</button>
      <button type="button" onClick={() => choose(null)}>Back to tutorials</button>
    </div> : <div className={styles.walkthrough}>
      <aside ref={coachRef} className={styles.coach} aria-live="polite" aria-atomic="true">
        <div className={styles.bubble} key={`${journey}-${journey === "host" ? hostStep : joinStep}`}><strong>{hint[0]}</strong><p>{hint[1]}</p></div>
        <svg className={styles.arrow} viewBox="0 0 160 80" fill="none" aria-hidden="true"><path d="M12 12C90 0 32 64 143 53M125 37l20 17-25 12" /></svg>
      </aside>
      <div className={styles.surface}>
        {journey === "host" ? <CreateEventForm tutorial={hostTutorial} /> : <>
          <div className={styles.activity}><span>Tennis · Riverside, Example City</span><h3>An easy evening rally</h3><p>90 minutes · Beginner &amp; intermediate · 4 places</p></div>
          <JoinRequestControls eventId="practice-event" request={null} tutorial={joinTutorial} />
        </>}
      </div>
    </div>}
  </section>;
}
