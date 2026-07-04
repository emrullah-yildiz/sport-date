import { buildDirectionsUrl, formatFullAddress } from "@/lib/directions";

// The precise meeting point shown ONLY to the host + accepted attendees
// (CX-20260704-feature-precise-address-and-maps). Renders the full structured
// address and a keyless "Get directions" link that opens the native maps app.
// This is a post-acceptance surface — it must never be rendered on discovery,
// the public /e/{id} invite, OG images, or notifications.
//
// Presentational (no client JS): the directions link is a plain anchor the member
// taps themselves, so no third-party map is embedded and no location is sent to a
// vendor until the member acts.
export default function AcceptedMeetingPoint({
  venueName,
  address,
  postalCode,
  city,
  latitude,
  longitude,
  instructions,
  headingId,
}: {
  venueName: string;
  address: string;
  postalCode?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  instructions?: string | null;
  headingId?: string;
}) {
  const fullAddress = formatFullAddress({ address, postalCode, city });
  const directionsUrl = buildDirectionsUrl({
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    venueName,
    address,
    postalCode,
    city,
  });
  return (
    <>
      <h2 id={headingId}>{venueName}</h2>
      {fullAddress ? <p className="accepted-meeting-address">{fullAddress}</p> : null}
      <a
        className="accepted-meeting-directions"
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Get directions to ${venueName} in your maps app (opens in a new tab)`}
      >
        <span aria-hidden="true">➜ </span>Get directions
      </a>
      {instructions ? <small className="accepted-meeting-instructions">{instructions}</small> : null}
    </>
  );
}
