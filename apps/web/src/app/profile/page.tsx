import Link from "next/link";
import { redirect } from "next/navigation";

import EmailVerificationControls from "@/components/EmailVerificationControls";
import LogoutButton from "@/components/LogoutButton";
import PrivacyControls from "@/components/PrivacyControls";
import CommunicationPreferences from "@/components/CommunicationPreferences";
import EditProfileForm from "@/components/EditProfileForm";
import MovementArc from "@/components/MovementArc";
import MobileSessionControls from "@/components/MobileSessionControls";
import { getCommunicationPreferences } from "@/lib/communication-preferences";
import { getMemberMovementProgress } from "@/lib/progress";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Your profile — Sport Date" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [movementProgress, communicationPreferences] = await Promise.all([
    getMemberMovementProgress(user.id),
    getCommunicationPreferences(user.id),
  ]);

  return (
    <main className="profile-page">
      <nav className="profile-nav">
        <Link href="/landing" className="logo">Sport Date</Link>
        <LogoutButton />
      </nav>
      <section className="profile-hero">
        <div>
          <p className="eyebrow">Your private beta profile</p>
          <h1>{user.firstName}, ready when the right game appears.</h1>
          <p>This is your current private account record, with live controls for export, deletion, device sessions, and the preview-era legal boundary.</p>
        </div>
        <div className="profile-initials" aria-hidden="true">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</div>
      </section>
      <div className="profile-primary-action"><Link href="/discover">Discover events <span aria-hidden="true">→</span></Link><Link href="/events/new">Host a new event <span aria-hidden="true">→</span></Link><Link href="/safety">Safety center <span aria-hidden="true">→</span></Link><Link href="/trust">Trust preview <span aria-hidden="true">→</span></Link><Link href="/privacy">Privacy Notice preview <span aria-hidden="true">→</span></Link><Link href="/feedback">Share feedback <span aria-hidden="true">→</span></Link></div>
      <section className="profile-grid">
        <article className="profile-panel">
          <p className="panel-label">About</p>
          <h2>{user.firstName} {user.lastName}</h2>
          <p>{user.location}</p>
          {user.bio ? <blockquote>{user.bio}</blockquote> : <p className="profile-empty">Add a short introduction when profile editing arrives.</p>}
        </article>
        <article className="profile-panel">
          <p className="panel-label">Connection</p>
          <h2 className="capitalize">{user.seeking}</h2>
          <p>{user.email}</p>
          <EmailVerificationControls emailVerified={user.emailVerified} />
        </article>
        <article className="profile-panel profile-sports">
          <p className="panel-label">Your movement</p>
          <div className="profile-sport-list">{user.sports.map((sport) => <div className="profile-sport" key={sport.name}><strong>{sport.name}</strong><span>{sport.skillLevel} · {sport.frequency}</span></div>)}</div>
        </article>
      </section>
      <MovementArc progress={movementProgress} />
      <CommunicationPreferences preferences={communicationPreferences} />
      <MobileSessionControls />
      <EditProfileForm profile={user} />
      <PrivacyControls />
    </main>
  );
}
