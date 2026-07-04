// Keyless "Get directions" link builder for the POST-ACCEPTANCE meeting point
// (CX-20260704-feature-precise-address-and-maps).
//
// Pure + no imports so it is unit-testable and usable anywhere. It builds a
// Google Maps Directions URL that needs NO API key and opens the native maps app
// on mobile. It is only ever rendered on an accepted-attendee / host surface — it
// receives the precise venue, which is never exposed pre-acceptance — and it is
// followed by the member's own tap, so no third-party map embed leaks a location.

export type DirectionsInput = Readonly<{
  latitude: number | null;
  longitude: number | null;
  venueName: string;
  address: string;
  postalCode?: string | null;
  city?: string | null;
}>;

/**
 * A keyless Google Maps directions URL. Prefers precise coordinates
 * (`destination=<lat>,<lng>`) when available; otherwise falls back to the
 * url-encoded full address (`destination=<venue, street, postcode, city>`).
 */
export function buildDirectionsUrl(input: DirectionsInput): string {
  const base = "https://www.google.com/maps/dir/?api=1&destination=";
  const lat = input.latitude;
  const lng = input.longitude;
  if (typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng)) {
    return `${base}${encodeURIComponent(`${lat},${lng}`)}`;
  }
  const parts = [input.venueName, input.address, input.postalCode ?? "", input.city ?? ""]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);
  return `${base}${encodeURIComponent(parts.join(", "))}`;
}

/**
 * Validate the mandatory postal code of the structured precise address. Non-empty,
 * trimmed, ≤ 20 chars (mirrors the DB CHECK). Returns a calm host-voice error the
 * event-create/edit routes surface tied to the postal-code field.
 */
export function validateEventPostalCode(raw: unknown): { valid: true; postalCode: string } | { valid: false; error: string } {
  const postalCode = typeof raw === "string" ? raw.trim() : "";
  if (postalCode.length < 1 || postalCode.length > 20) {
    return { valid: false, error: "Add a postal code for the meeting address." };
  }
  return { valid: true, postalCode };
}

/**
 * Validate the OPTIONAL precise map pin captured by address autocomplete
 * (CX-20260704-event-address-autocomplete-geocode).
 *
 * When the host picks a suggestion, accurate lat/lng arrive and are stored so the
 * post-acceptance "Get directions" link is precise. But the geocoder is a free,
 * best-effort provider (Photon/Komoot) — if it is unavailable, or the host typed
 * the address manually, we must NOT block event creation. So absent coordinates
 * are accepted (both stored as `null`; the directions link then falls back to the
 * url-encoded full address). Coordinates that ARE supplied must be a finite,
 * in-range pair — a partial or out-of-range pair is rejected rather than stored as
 * a garbage pin.
 */
export function validateOptionalPinnedEventLocation(latitude: unknown, longitude: unknown): { valid: true; latitude: number | null; longitude: number | null } | { valid: false; error: string } {
  const latEmpty = latitude === null || latitude === undefined || latitude === "";
  const lngEmpty = longitude === null || longitude === undefined || longitude === "";
  // Fallback path: no pin at all → allowed, directions use the typed address.
  if (latEmpty && lngEmpty) return { valid: true, latitude: null, longitude: null };
  // A half-supplied pair can't be a real pin (and `Number("")` would coerce to 0).
  if (latEmpty || lngEmpty) {
    return { valid: false, error: "That map pin looks invalid. Search and choose an address, or clear it to continue without a pin." };
  }
  const lat = typeof latitude === "number" ? latitude : Number(latitude);
  const lng = typeof longitude === "number" ? longitude : Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { valid: false, error: "That map pin looks invalid. Search and choose an address, or clear it to continue without a pin." };
  }
  return { valid: true, latitude: lat, longitude: lng };
}

/** The full one-line address for display on an accepted surface. */
export function formatFullAddress(input: { address: string; postalCode?: string | null; city?: string | null }): string {
  return [input.address, input.postalCode ?? "", input.city ?? ""]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
}
