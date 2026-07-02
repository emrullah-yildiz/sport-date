import type { ViewableMemberProfile } from "@/lib/member-profile";
import type { SessionUser } from "@/lib/session";

// Presentation for viewing ANOTHER member's profile within a legitimate relationship.
// It reuses the exact humane classes and copy shape of the verified self-view profile
// (intro, looking-for with seeking-as-equals, languages, sports with human
// skill/frequency phrasing, prompts, photos) so the two never drift — but it shows
// ONLY the privacy-safe fields carried by ViewableMemberProfile. There is no account
// panel, no contact detail, no precise/meeting location, and no score/ranking of any
// kind. Photos are served through the authenticated, block-gated /api/photos route.

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

function describeSport(
  skillLevel: SessionUser["sports"][number]["skillLevel"],
  frequency: SessionUser["sports"][number]["frequency"],
): string {
  return `${SKILL_PHRASES[skillLevel]} · ${FREQUENCY_PHRASES[frequency]}`;
}

export default function MemberProfileView({
  profile,
  relationshipLabel,
}: {
  profile: ViewableMemberProfile;
  // A short, honest reminder of WHY the viewer can see this profile (e.g. because the
  // member requested a place in their event). Non-identifying, no private data.
  relationshipLabel: string;
}) {
  const primaryPhoto = profile.photos.find((photo) => photo.isPrimary) ?? profile.photos[0] ?? null;
  const galleryPhotos = profile.photos;

  return (
    <>
      <section className="profile-hero">
        <div>
          <p className="eyebrow">{relationshipLabel}</p>
          <h1>{profile.firstName} {profile.lastName}</h1>
          <p className="profile-hero-meta">
            <span className="profile-hero-fact">{profile.location}</span>
            <span aria-hidden="true">·</span>
            <span className="profile-hero-fact">{profile.age}</span>
            <span aria-hidden="true">·</span>
            <span className="profile-hero-fact profile-hero-seeking">{SEEKING_SUMMARIES[profile.seeking]}</span>
          </p>
          <p>This is how {profile.firstName} comes across to people deciding whether to play — a warm, honest picture, no scores, no ranking. The exact meeting point and contact details are never shown here.</p>
        </div>
        {primaryPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="profile-hero-photo"
            src={`/api/photos/${primaryPhoto.id}`}
            alt={primaryPhoto.alt || `${profile.firstName} ${profile.lastName}`}
            width={150}
            height={150}
          />
        ) : (
          <div className="profile-initials" aria-hidden="true">{profile.firstName.charAt(0)}{profile.lastName.charAt(0)}</div>
        )}
      </section>

      <section className="profile-grid">
        <article className="profile-panel">
          <p className="panel-label">Intro</p>
          <h2>A little about {profile.firstName}</h2>
          {profile.bio
            ? <blockquote>{profile.bio}</blockquote>
            : <p className="profile-empty">{profile.firstName} hasn&rsquo;t written an intro yet.</p>}
        </article>

        <article className="profile-panel">
          <p className="panel-label">Looking for</p>
          <h2 className="capitalize">{SEEKING_HEADLINES[profile.seeking]}</h2>
          <p>{SEEKING_SUMMARIES[profile.seeking]} Dating, friendship, and group games are all first-class here — none is a consolation prize.</p>
        </article>

        <article className="profile-panel">
          <p className="panel-label">Languages</p>
          {profile.languages.length > 0 ? (
            <>
              <h2>{profile.languages.length === 1 ? "Speaks" : "Comfortable in"}</h2>
              <ul className="profile-chip-list" aria-label={`Languages ${profile.firstName} is comfortable in`}>
                {profile.languages.map((language) => <li className="profile-chip" key={language}>{language}</li>)}
              </ul>
            </>
          ) : (
            <>
              <h2>Languages</h2>
              <p className="profile-empty">No languages listed yet.</p>
            </>
          )}
        </article>

        <article className="profile-panel profile-sports">
          <p className="panel-label">On the field</p>
          <h2>The sports {profile.firstName} plays</h2>
          {profile.sports.length > 0 ? (
            <div className="profile-sport-list">{profile.sports.map((sport) => (
              <div className="profile-sport" key={sport.name}>
                <strong>{sport.name}</strong>
                <span>{describeSport(sport.skillLevel, sport.frequency)}</span>
              </div>
            ))}</div>
          ) : (
            <p className="profile-empty">No sports listed yet.</p>
          )}
        </article>

        <article className="profile-panel profile-prompts">
          <p className="panel-label">In their words</p>
          <h2>A few things about {profile.firstName}</h2>
          {profile.prompts.length > 0 ? (
            <dl className="profile-prompt-list">{profile.prompts.map((prompt) => (
              <div className="profile-prompt" key={prompt.prompt}>
                <dt>{prompt.prompt}</dt>
                <dd>{prompt.answer}</dd>
              </div>
            ))}</dl>
          ) : (
            <p className="profile-empty">{profile.firstName} hasn&rsquo;t answered any prompts yet.</p>
          )}
        </article>
      </section>

      {galleryPhotos.length > 0 ? (
        <section className="profile-photos" aria-labelledby="member-photos-heading">
          <p className="panel-label">Photos</p>
          <h2 id="member-photos-heading">How {profile.firstName} looks in person</h2>
          <p className="profile-photos-intro">A small series so you can recognise {profile.firstName} at the meeting point. No scores, no ranking.</p>
          <ol className="profile-photos-series" aria-label={`${profile.firstName}'s photos, in order`}>
            {galleryPhotos.map((photo, index) => (
              <li className="profile-photo-item" key={photo.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="profile-photo-image"
                  src={`/api/photos/${photo.id}`}
                  alt={photo.alt || `${profile.firstName}, photo ${index + 1} of ${galleryPhotos.length}`}
                  loading="lazy"
                  width={220}
                  height={220}
                />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
