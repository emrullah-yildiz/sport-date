import type { Seeking } from "@sport-date/domain";

export const CONNECTION_CHOICES: readonly { value: Seeking; label: string; description: string }[] = [
  { value: "dating", label: "Dating", description: "Open to meeting a romantic partner through sport." },
  { value: "friendship", label: "Friendship", description: "Meet new friends and people to play with." },
  { value: "group", label: "Community", description: "Find your people through social sports and group activities." },
];

export function connectionLabels(preferences: readonly Seeking[]): string {
  return CONNECTION_CHOICES.filter(option => preferences.includes(option.value)).map(option => option.label).join(", ");
}

export function toggleConnection(preferences: readonly Seeking[], value: Seeking): Seeking[] {
  return preferences.includes(value) ? preferences.filter(item => item !== value) : [...preferences, value];
}
