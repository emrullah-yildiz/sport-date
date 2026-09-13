import type { Metadata } from "next";
import ConceptExperience from "./ConceptExperience";

export const metadata: Metadata = {
  title: "Design preview: more good company",
  description: "An interactive design concept for meeting people through small local sports activities.",
  robots: { index: false, follow: false },
};

export default function ConceptPage() {
  return <ConceptExperience />;
}
