import { permanentRedirect } from "next/navigation";

// Consolidated into the Safety Center (CX-20260702-ia-consolidate-guideline-and-legal-pages).
// The safety guidance now lives as a progressively-disclosed section on /safety.
// Keep this route as a permanent (308) redirect so shared links and bookmarks resolve.
export default function SafetyGuidelinesRedirect() {
  permanentRedirect("/safety#guidelines");
}
