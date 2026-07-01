import Link from "next/link";
import { redirect } from "next/navigation";

import EmailVerificationControls from "@/components/EmailVerificationControls";
import LogoutButton from "@/components/LogoutButton";
import PrivacyControls from "@/components/PrivacyControls";
import CommunicationPreferences from "@/components/CommunicationPreferences";
import EditProfileForm from "@/components/EditProfileForm";
import MovementArc from "@/components/MovementArc";
import MobileSessionControls from "@/components/MobileSessionControls";
import WebSessionControls from "@/components/WebSessionControls";
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
          <h1>{user.firstName} {user.lastName}</h1>
          <p>Ready when the right game appears. This is your private account record, with live controls for export, deletion, device sessions, and the preview-era legal boundary.</p>
        </div>
        <div className="profile-initials" aria-hidden="true">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</div>
      </section>
      <div className="profile-actions">
        <nav className="profile-actions-primary" aria-label="Your main actions">
          <Link href="/events/new" className="nav-host-cta profile-action-primary" aria-label="Host an event — create a new game">Host an event <span aria-hidden="true">→</span></Link>
          <Link href="/discover" className="profile-action-primary" aria-label="Discover events to join">Discover events <span aria-hidden="true">→</span></Link>
          <Link href="/hosting" className="profile-action-primary" aria-label="Your events and hosting">Your events <span aria-hidden="true">→</span></Link>
        </nav>
        <nav className="profile-actions-secondary" aria-label="Safety, legal, and support">
          <p className="profile-actions-secondary-label" id="profile-actions-secondary-label">Safety, legal &amp; support</p>
          <ul aria-labelledby="profile-actions-secondary-label">
            <li><Link href="/safety" className="profile-action-secondary" aria-label="Safety center">Safety center</Link></li>
            <li><Link href="/trust" className="profile-action-secondary" aria-label="Trust preview — pre-launch">Trust <span className="profile-action-tag">preview</span></Link></li>
            <li><Link href="/privacy" className="profile-action-secondary" aria-label="Privacy Notice preview — pre-launch">Privacy Notice <span className="profile-action-tag">preview</span></Link></li>
            <li><Link href="/feedback" className="profile-action-secondary" aria-label="Share feedback">Share feedback</Link></li>
          </ul>
        </nav>
      </div>
      <section className="profile-grid">
        <article className="profile-panel">
          <p className="panel-label">About</p>
          <h2>{user.location}</h2>
          <p>Where you move · {user.firstName}&rsquo;s home base for meeting people through sport.</p>
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
      <WebSessionControls />
      <MobileSessionControls />
      <EditProfileForm profile={user} />
      <PrivacyControls />
    </main>
  );
}
