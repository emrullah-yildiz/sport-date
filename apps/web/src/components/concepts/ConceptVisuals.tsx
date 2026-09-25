import type { Sport } from "./concept-data";

export function Arrow({ back = false }: { back?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={back ? { transform: "rotate(180deg)" } : undefined}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export function SportGlyph({ sport, size = 26 }: { sport: Sport; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    {sport === "Running" ? <><path d="m15 6 8 4-4 11 8 5 5 8M19 21l-7 9H5M23 10l5 9h7M12 15l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="25" cy="4" r="3" fill="currentColor" /></> : <><ellipse cx="24" cy="14" rx="9" ry="12" transform="rotate(35 24 14)" stroke="currentColor" strokeWidth="1.6" /><path d="m17 24-9 12m3-3-3-2M21 4l11 8M16 11l14 10M21 25 32 8M15 18l11-15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="32" cy="33" r={sport === "Padel" ? 3 : 4} stroke="currentColor" strokeWidth="1.5" /></>}
  </svg>;
}
export function CourtLines({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 600 360" fill="none" aria-hidden="true"><rect x="40" y="30" width="520" height="300" rx="2" /><path d="M95 30v300M505 30v300M300 30v300M95 90h410M95 270h410M95 180h410" /><path d="M288 15v330M298 15v330M308 15v330" strokeDasharray="3 5" /></svg>;
}
