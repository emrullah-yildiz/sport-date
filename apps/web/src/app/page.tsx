import { permanentRedirect } from "next/navigation";

export default function Home() {
  // 308, not 307: the bare domain is our most-shared URL (social bios, posters)
  // and search engines should permanently consolidate it onto /landing.
  permanentRedirect("/landing");
}
