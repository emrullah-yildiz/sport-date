import Link from "next/link";
import { redirect } from "next/navigation";

import PrimaryNav from "@/components/PrimaryNav";
import EmailVerificationControls from "@/components/EmailVerificationControls";
import PrivacyControls from "@/components/PrivacyControls";
import CommunicationPreferences from "@/components/CommunicationPreferences";
import EditProfileForm from "@/components/EditProfileForm";
import MovementArc from "@/components/MovementArc";
import MobileSessionControls from "@/components/MobileSessionControls";
import PlusBilling from "@/components/PlusBilling";
import ProfilePhotos from "@/components/ProfilePhotos";
import ReceivedRatingSummary from "@/components/ReceivedRatingSummary";
import SiteFooter from "@/components/SiteFooter";
import WebSessionControls from "@/components/WebSessionControls";
import { getCommunicationPreferences } from "@/lib/communication-preferences";
import { isPlus } from "@/lib/entitlements";
import { isBillingConfigured } from "@/lib/stripe";
import { getReceivedRatingAggregate } from "@/lib/peer-feedback";
import { listProfilePhotos } from "@/lib/photos";
import { getMemberMovementProgress } from "@/lib/progress";
import { getCurrentUser, type SessionUser } from "@/lib/session";

export const metadata = { title: "Your profile" };

const SEEKING_HEADLINES: Record<SessionUser["seeking"], string> = {
  dating: "Dating",
  friendship: "Friendship",
  group: "Group games",
};

const SEEKING_SUMMARIES: Record<SessionUser["seeking"], string> = {
  dating: "Open to dating through sport.",
  friendship: "Here to make friends through sport.",
  group: "Here for group games and good company.",
};

const SKILL_PHRASES: Record<SessionUser["sports"][number]["skillLevel"], string> = {
  beginner: "Just starting out",
  intermediate: "Plays at an intermediate level",
  advanced: "Plays at an advanced level",
};

const FREQUENCY_PHRASES: Record<SessionUser["sports"][number]["frequency"], string> = {
  weekly: "most weeks",
  biweekly: "every couple of weeks",
  monthly: "about once a month",
  casual: "now and then",
};

function seekingHeadline(seeking: SessionUser["seeking"]): string {
  return SEEKING_HEADLINES[seeking];
}

function seekingSummary(seeking: SessionUser["seeking"]): string {
  return SEEKING_SUMMARIES[seeking];
}

function describeSport(
  skillLevel: SessionUser["sports"][number]["skillLevel"],
  frequency: SessionUser["sports"][number]["frequency"],
): string {
  return `${SKILL_PHRASES[skillLevel]} · ${FREQUENCY_PHRASES[frequency]}`;
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [movementProgress, communicationPreferences, receivedRating, photos] = await Promise.all([
    getMemberMovementProgress(user.id),
    getCommunicationPreferences(user.id),
    getReceivedRatingAggregate(user.id),
    listProfilePhotos(user.id),
  ]);
  const primaryPhoto = photos.find((photo) => photo.isPrimary) ?? photos[0] ?? null;
  // Server-computed billing/entitlement state. The Plus surface is fully hidden
  // when billing is dormant (flag off / no keys); `isPlus` fails closed to FREE.
  const billingConfigured = isBillingConfigured();
  const memberIsPlus = isPlus(user);

  return (
    <main className="profile-page">
      <PrimaryNav firstName={user.firstName} />
      <section className="profile-hero">
        <div>
          <p className="eyebrow">Your private beta profile</p>
          <h1>{user.firstName} {user.lastName}</h1>
          <p className="profile-hero-meta">
            <span className="profile-hero-fact">{user.location}</span>
            <span aria-hidden="true">·</span>
            <span className="profile-hero-fact">{user.age}</span>
            <span aria-hidden="true">·</span>
            <span className="profile-hero-fact profile-hero-seeking">{seekingSummary(user.seeking)}</span>
          </p>
          <p>Ready when the right game appears. This is how you&rsquo;ll come across to people deciding whether to play — a warm, honest picture, no scores, no ranking. It stays your private account record too, with live controls for export, deletion, device sessions, and the preview-era legal boundary.</p>
        </div>
        {primaryPhoto ? (
          // Where a single image is shown, use the member's primary photo.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="profile-hero-photo"
            src={`/api/photos/${primaryPhoto.id}`}
            alt={primaryPhoto.alt || `${user.firstName} ${user.lastName}`}
            width={150}
            height={150}
          />
        ) : (
          <div className="profile-initials" aria-hidden="true">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</div>
        )}
      </section>
      <div className="profile-actions">
        <nav className="profile-actions-primary" aria-label="Your main actions">
          <Link href="/events/new" className="nav-host-cta profile-action-primary" aria-label="Host an event — create a new game">Host an event <span aria-hidden="true">→</span></Link>
          <Link href="/discover" className="profile-action-primary" aria-label="Discover events to join">Discover events <span aria-hidden="true">→</span></Link>
          <Link href="/hosting" className="profile-action-primary" aria-label="Your events and hosting">Your events <span aria-hidden="true">→</span></Link>
        </nav>
        <nav className="profile-actions-secondary" aria-label="Safety and support">
          <p className="profile-actions-secondary-label" id="profile-actions-secondary-label">Safety &amp; support</p>
          <ul aria-labelledby="profile-actions-secondary-label">
            <li><Link href="/safety" className="profile-action-secondary" aria-label="Safety center">Safety center</Link></li>
            <li><Link href="/safety#guidelines" className="profile-action-secondary" aria-label="Safety guidelines — how to meet safely">Safety guidelines</Link></li>
            <li><Link href="/feedback" className="profile-action-secondary" aria-label="Share feedback">Share feedback</Link></li>
          </ul>
        </nav>
      </div>
      <section className="profile-grid">
        <article className="profile-panel">
          <p className="panel-label">Intro</p>
          <h2>A little about {user.firstName}</h2>
          {user.bio
            ? <blockquote>{user.bio}</blockquote>
            : (
              <div className="profile-empty-block">
                <p className="profile-empty">No intro yet. A sentence or two about why you play helps people say yes.</p>
                <Link href="#edit-profile" className="profile-empty-action">Write a short intro <span aria-hidden="true">→</span></Link>
              </div>
            )}
        </article>
        <article className="profile-panel">
          <p className="panel-label">Looking for</p>
          <h2 className="capitalize">{seekingHeadline(user.seeking)}</h2>
          <p>{seekingSummary(user.seeking)} Dating, friendship, and group games are all first-class here — pick whatever fits you now, change it whenever.</p>
        </article>
        <article className="profile-panel">
          <p className="panel-label">Languages</p>
          {user.languages.length > 0 ? (
            <>
              <h2>{user.languages.length === 1 ? "Speaks" : "Comfortable in"}</h2>
              <ul className="profile-chip-list" aria-label="Languages you are comfortable in">
                {user.languages.map((language) => <li className="profile-chip" key={language}>{language}</li>)}
              </ul>
            </>
          ) : (
            <div className="profile-empty-block">
              <h2>Languages</h2>
              <p className="profile-empty">No languages listed yet. Adding the languages you&rsquo;re comfortable in helps people who share one find you — and lets more events match you.</p>
              <Link href="#edit-profile" className="profile-empty-action">Add a language <span aria-hidden="true">→</span></Link>
            </div>
          )}
        </article>
        <article className="profile-panel">
          <p className="panel-label">Account</p>
          <h2>Contact &amp; sign-in</h2>
          <p>{user.email}</p>
          <EmailVerificationControls emailVerified={user.emailVerified} />
        </article>
        <article className="profile-panel profile-sports">
          <p className="panel-label">On the field</p>
          <h2>The sports {user.firstName} plays</h2>
          {user.sports.length > 0 ? (
            <div className="profile-sport-list">{user.sports.map((sport) => (
              <div className="profile-sport" key={sport.name}>
                <strong>{sport.name}</strong>
                <span>{describeSport(sport.skillLevel, sport.frequency)}</span>
              </div>
            ))}</div>
          ) : (
            <div className="profile-empty-block">
              <p className="profile-empty">No sports listed yet. Add at least one so compatible events can find you and show up in discovery.</p>
              <Link href="#edit-profile" className="profile-empty-action">Add a sport <span aria-hidden="true">→</span></Link>
            </div>
          )}
        </article>
        <article className="profile-panel profile-prompts">
          <p className="panel-label">In their words</p>
          <h2>A few things about {user.firstName}</h2>
          {user.prompts.length > 0 ? (
            <dl className="profile-prompt-list">{user.prompts.map((prompt) => (
              <div className="profile-prompt" key={prompt.prompt}>
                <dt>{prompt.prompt}</dt>
                <dd>{prompt.answer}</dd>
              </div>
            ))}</dl>
          ) : (
            <div className="profile-empty-block">
              <p className="profile-empty">No prompts answered yet. Optional one-liners like &ldquo;A perfect Saturday game is…&rdquo; give people a real sense of you — you can add up to three.</p>
              <Link href="#edit-profile" className="profile-empty-action">Answer a prompt <span aria-hidden="true">→</span></Link>
            </div>
          )}
        </article>
      </section>
      <ProfilePhotos firstName={user.firstName} />
      <PlusBilling billingConfigured={billingConfigured} isPlus={memberIsPlus} />
      <MovementArc progress={movementProgress} />
      <ReceivedRatingSummary aggregate={receivedRating} />
      <CommunicationPreferences preferences={communicationPreferences} />
      <WebSessionControls />
      <MobileSessionControls />
      <EditProfileForm profile={user} />
      <PrivacyControls />
      <SiteFooter />
    </main>
  );
}
