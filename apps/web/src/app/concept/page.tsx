import type { Metadata } from "next";
import LandingExperience from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Design preview: more good company",
  description: "An interactive design concept for meeting people through small local sports activities.",
  robots: { index: false, follow: false },
};

export default function ConceptPage() {
  return <LandingExperience preview />;
}
