// Single source of truth for sport → emoji, shared by the public landing page
// and the sign-up sport picker so the two surfaces can never drift apart.
// Marketing shows friendly emoji for each sport; sign-up must use the same.

export interface SportPreset {
  name: string;
  emoji: string;
}

// Default glyph for any sport without an explicit emoji (e.g. a member's
// custom-added sport). Keeps cards from rendering an empty/broken icon.
export const DEFAULT_SPORT_EMOJI = "🤸";

// Ordered list rendered on both the landing "From a 5K to a chess board"
// section and sign-up Step 3. Keep names + emoji consistent across the app.
export const SPORT_PRESETS: SportPreset[] = [
  { name: "Running", emoji: "🏃" },
  { name: "Tennis", emoji: "🎾" },
  { name: "Padel", emoji: "🏓" },
  { name: "Football", emoji: "⚽" },
  { name: "Basketball", emoji: "🏀" },
  { name: "Volleyball", emoji: "🏐" },
  { name: "Bouldering", emoji: "🧗" },
  { name: "Climbing", emoji: "🧗" },
  { name: "Hiking", emoji: "🥾" },
  { name: "Cycling", emoji: "🚴" },
  { name: "Swimming", emoji: "🏊" },
  { name: "Yoga", emoji: "🧘" },
  { name: "Dancing", emoji: "💃" },
  { name: "Table Tennis", emoji: "🏓" },
  { name: "Badminton", emoji: "🏸" },
  { name: "Chess", emoji: "♟️" },
];

const EMOJI_BY_NAME = new Map(
  SPORT_PRESETS.map((sport) => [sport.name.toLowerCase(), sport.emoji]),
);

// Resolve a sport name to its emoji, falling back to a sensible default so
// custom user-added sports always get a glyph rather than nothing.
export function sportEmoji(name: string): string {
  return EMOJI_BY_NAME.get(name.trim().toLowerCase()) ?? DEFAULT_SPORT_EMOJI;
}
