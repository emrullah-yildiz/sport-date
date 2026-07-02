import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PrimaryNav from "@/components/PrimaryNav";
import MemberProfileView from "@/components/MemberProfileView";
import SiteFooter from "@/components/SiteFooter";
import { getViewableMemberProfile, memberProfileRelationshipLabel } from "@/lib/member-profile";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Member profile" };

// Member-to-member profile view. Authentication is required, and the profile is
// only ever returned when getViewableMemberProfile confirms a qualifying, already-
// existing relationship (host↔requester, or accepted participant↔host/co-participant)
// with no block in either direction. Any other case — unauthenticated, unrelated,
// blocked, self, or a non-existent/invalid id — resolves to 404, so the route neither
// confirms a member exists to an unrelated viewer nor offers a guessable public index.
export default async function MemberProfilePage({ params }: { params: Promise<{ memberId: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const { memberId } = await params;
  const profile = await getViewableMemberProfile(viewer.id, memberId);
  if (!profile) notFound();

  return (
    <main className="profile-page">
      <PrimaryNav firstName={viewer.firstName} />
      <MemberProfileView
        profile={profile}
        relationshipLabel={memberProfileRelationshipLabel(profile.relationship)}
      />
      <section className="member-profile-safety">
        <p>Meeting someone new? Keep coordination in the event room, meet in the public place first, and use report or block if anything feels off. A profile is a trust check, not a safety guarantee.</p>
        <Link href="/safety">Visit the safety center <span aria-hidden="true">→</span></Link>
      </section>
      <SiteFooter />
    </main>
  );
}
