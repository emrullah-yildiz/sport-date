import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Barlow_Condensed } from "next/font/google";
import ConceptStudio from "@/components/concepts/ConceptStudio";

const sportType = Barlow_Condensed({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-concept-sport", display: "swap" });

export const metadata: Metadata = {
  title: "Three ways to play — design studio",
  description: "Local-only interactive KeepItUp design concepts. All people and activities are fictional.",
  robots: { index: false, follow: false },
};

export default function ConceptsPage() {
  // This exploratory route is never available in a production build.
  if (process.env.NODE_ENV !== "development") notFound();
  return <div className={sportType.variable}><ConceptStudio /></div>;
}
