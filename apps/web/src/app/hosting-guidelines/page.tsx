import { permanentRedirect } from "next/navigation";

// Folded into the hosting hub (CX-20260702-ia-consolidate-guideline-and-legal-pages).
// Host expectations now live as a progressively-disclosed "Hosting standards"
// section on /hosting. Keep this route as a permanent (308) redirect so shared
// links and bookmarks resolve to the standards anchor.
export default function HostingGuidelinesRedirect() {
  permanentRedirect("/hosting#standards");
}
