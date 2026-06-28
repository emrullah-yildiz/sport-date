import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import PrivacyControls from "@/components/PrivacyControls";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Your profile — Sport Date" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
          <p>Events and profile editing are being built next. For now, this is exactly what the account remembers.</p>
        </div>
        <div className="profile-initials" aria-hidden="true">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</div>
      </section>
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
          <span className={`verification-state ${user.emailVerified ? "verified" : "pending"}`}>{user.emailVerified ? "Email verified" : "Email verification pending"}</span>
        </article>
        <article className="profile-panel profile-sports">
          <p className="panel-label">Your movement</p>
          <div className="profile-sport-list">{user.sports.map((sport) => <div className="profile-sport" key={sport.name}><strong>{sport.name}</strong><span>{sport.skillLevel} · {sport.frequency}</span></div>)}</div>
        </article>
      </section>
      <PrivacyControls />
    </main>
  );
}
