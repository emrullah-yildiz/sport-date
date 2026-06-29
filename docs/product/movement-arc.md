# Movement Arc

## Product purpose

The Movement Arc gamifies the courage and reliability involved in meeting through sport without turning people into scores. It is private, finite, and based on completed real-world participation rather than app consumption.

## Progress source

A move qualifies only when all of the following are true:

- the event's scheduled duration has ended;
- the member was an accepted participant, or was the host of an event with at least one accepted participant;
- the member privately confirms `attended` in the event room; and
- the server records that eligibility at reflection time and marks `qualified_for_progress = true` only when the member confirms `attended`.

Elapsed time alone never creates progress. Requests, acceptances, host skips, profile browsing, reports, daily login, and screen time never create progress. A host cannot advance with an empty event. Reflections marked `left early` or `did not attend` are still saved for correction and export, but they do not qualify for progress. Later cancellation or safety access changes do not silently rewrite whether the event qualified at reflection time, while correcting the reflection from or to `attended` updates the visible count.

## Stages

| Self-confirmed moves | Stage | Emotional purpose |
| --- | --- | --- |
| 0 | Warm-up | Make the first step feel possible. |
| 1 | First move | Recognize showing up once. |
| 3 | Finding rhythm | Show that isolated effort is becoming a pattern. |
| 6 | In motion | Reflect sustained participation without status competition. |
| 10 | Local pulse | End the fixed ladder and return attention to worthwhile encounters. |

The final stage has no infinite point chase, prestige tier, leaderboard, scarcity mechanic, or daily streak.

## Reflection

After an event ends, hosts and accepted participants can privately record:

- attended, left early, or did not attend; and
- yes, no, or prefer not to say for willingness to join the group again.

The answer is editable for rectification. Leaving early or not attending creates no public mark or points penalty. The screen explicitly separates reflection from safety reporting. Willingness answers are not shown to hosts or participants.

## Experience states

- Empty: explain that progress starts only after a finished, self-confirmed event and link to discovery.
- Active: show the current stage, a bounded path, hosted/joined context, and up to three recent qualifying moves.
- Final stage: replace the next-target message with an open-ended invitation to choose worthwhile movement.
- Correction: recompute the private arc from current reflections without shame copy.
- Unsafe event: reporting remains prominent; no progress mechanic should pressure attendance or suppress a report.

## Measurement

Evaluate whether the Arc improves reflection completion, safe completed events, and willingness to meet again. Do not optimize it for daily active use or notification opens. Production analytics still require an approved lawful basis, minimization, access control, and retention design.

## Known limits

Attendance is self-confirmed, not identity verified. The Arc is a private reflection aid, not proof of reliability, safety, or fitness. It must never become a public trust badge or matching rank without a new safety, fairness, and legal review.
