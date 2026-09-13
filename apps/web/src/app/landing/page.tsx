import type { Metadata } from "next";
import ClickTracking from "@/components/ClickTracking";
import LandingExperience from "@/components/landing/LandingExperience";
import { BRAND_TITLE } from "@/lib/brand";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: { absolute: BRAND_TITLE },
  description: "Meet people for dating, friendship, or a new crew through small local sports activities. Find a plan, ask to join, and meet after the host accepts. Adults 18+.",
  alternates: { canonical: "/landing" },
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  // Only the display name crosses the client boundary, never the session or profile.
  return <>
    <ClickTracking />
    <LandingExperience memberName={user?.firstName ?? null} />
  </>;
}
