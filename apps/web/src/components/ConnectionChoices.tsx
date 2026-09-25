"use client";

import type { Seeking } from "@sport-date/domain";
import { CONNECTION_CHOICES, toggleConnection } from "@/lib/connection-preferences";

export default function ConnectionChoices({ value, onChange }: {
  value: readonly Seeking[]; onChange: (value: Seeking[]) => void;
}) {
  return <div className="connection-choices">
    <p>Choose all that fit. You can select more than one.</p>
    <div className="seeking-options" role="group" aria-label="Connection preferences">
      {CONNECTION_CHOICES.map(option => <button type="button" key={option.value}
        aria-pressed={value.includes(option.value)}
        className={`seeking-card ${value.includes(option.value) ? "active" : ""}`}
        onClick={() => onChange(toggleConnection(value, option.value))}>
        <strong>{option.label}<span className="connection-check" aria-hidden="true">{value.includes(option.value) ? "✓" : "+"}</span></strong>
        <span>{option.description}</span>
      </button>)}
    </div>
  </div>;
}
