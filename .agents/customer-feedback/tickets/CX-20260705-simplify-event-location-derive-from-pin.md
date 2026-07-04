# CX-20260705-simplify-event-location-derive-from-pin

- Status: `implemented`
- Severity: `medium`
- Priority: `P1` — owner-directed UX simplification of the event-create location section (2026-07-05). Reported live: "why do we need country code, the address part looks overdesigned, make it only place name and location selector and arrival details."
- Surface: event create + edit location section, its two API routes, and the location domain/validation.
- Implementation owner: `agent`

## Goal

Reduce the event **location** section from SEVEN manual inputs (City, Country code, Area/neighborhood, Venue name, Arrival address, Postal code, Arrival instructions) to **THREE** the host actually fills:

1. **Place name** (existing `venueName`).
2. **Location selector** (the existing `AddressAutocomplete` — one search box → choose a result → sets the pin).
3. **Arrival details** (existing `instructions`).

Everything else — **city, country code, public area label, postal code, latitude, longitude** — is **DERIVED from the selected pin**, never typed. Remove the manual `city`, `countryCode`, `areaLabel`, and `postalCode` inputs from the UI.

## Owner decision (confirmed)

- Public discovery area = **City + district**: use the pin's **district/neighbourhood when the provider returns one** (e.g. "Tineretului, București"), else fall back to **city**. Country code derived from the pin.

## How the derivation works

- `LocationSuggestion` (`lib/location-search.ts`) already carries `city`, `countryCode`, `postalCode`, `latitude`, `longitude`. **Add a `district` field** and populate it in `parsePhotonSuggestions` from Photon `properties.district` (fallback `properties.locality`) — keep `city` as today (`city || locality || county`). Add a unit test for the new field mapping (present, and absent → empty).
- `AddressAutocomplete` currently emits only `latitude`/`longitude` hidden inputs. On a chosen suggestion, **also emit hidden inputs** for the derived fields the form/API need: `city`, `countryCode`, `areaLabel` (= `district || city`), `postalCode`. (The visible `address` input already provides the private street address.) These hidden inputs must reflect the *currently selected* suggestion and clear when the selection is cleared.

## Privacy guardrails (do NOT regress — this is the product's core promise)

- The **public** approximate area must contain ONLY coarse components: `city`, `district`, `countryCode`. It must **never** contain the street/house-number address or the precise `latitude`/`longitude`. Add an explicit test asserting the derived public payload excludes the street address and precise coords.
- The **private** precise pin (`address`, `postalCode`, `latitude`, `longitude`) stays private until a request is accepted — unchanged behaviour. Keep the existing "identity is not sent, pin stays private until acceptance" microcopy.

## Graceful fallback (do NOT regress)

- Today a host can still publish when the geocoder is **down** or they type an address without selecting a suggestion (pin added later). Preserve this. Since city/country/district come from the pin, when there is **no structured result**, surface a **minimal conditional fallback** so publish never hard-blocks: show a single lightweight "City" (and, if needed, 2-letter country) field **only when no suggestion is selected / provider unavailable**, and derive `areaLabel` from that city. The happy path (a result is chosen) shows just the 3 inputs.

## Server + domain

- `api/events/route.ts` (create) and `api/events/[eventId]/route.ts` (edit): update validation so `areaLabel` and `postalCode` are no longer *required manual* fields — accept the derived values; `countryCode` derived from the pin (still validate format `^[A-Z]{2}$` when present). Keep `city` + a non-empty public area (`areaLabel` defaulting to `city`) required so discovery always has a coarse area. Do not weaken any auth/capacity/ownership checks.
- Mirror any location validation in the domain package (`packages/domain`) if it enforces these fields.
- Update `HostEditEventForm.tsx` to the same 3-input shape (prefill from the existing event; the pin's `initial` already flows through `AddressAutocomplete`).

## Presentation (de-clutter — "looks overdesigned")

- Keep the honest **"what discovery sees (approximate) vs what accepted people see (precise)"** trust framing — it is valuable — but slim it to match the 3 inputs so it no longer reads as a dense form. No dark patterns, no fabricated content.

## DoD

- typecheck / lint / test / production build green. Tests cover: district+city+country derivation from a pin, the no-pin/provider-down fallback still publishes, and the privacy assertion (public payload excludes street address + precise coords). Update the existing `api/events/[eventId]/route.test.ts` and any create-form/domain tests to the new contract.
- **No migration** expected (columns already exist). If you add one, commit-do-NOT-push and flag it. Otherwise commit AND push to main. `git pull --rebase` first. Do NOT touch `public/*.html` or `docs/marketing/**`.
- Run the FULL web test suite before pushing (apps/web/src change rule).

## Handoff log

- 2026-07-05 | ceo | filed from live owner report; confirmed public-area granularity = city + district. Ready for Builder.
- 2026-07-05 | builder | Implemented. Location section is now 3 host inputs (Place name, Location selector, Arrival details); city/countryCode/areaLabel/postalCode are DERIVED from the selected pin and emitted as hidden inputs by `AddressAutocomplete`. Added `district` to `LocationSuggestion` (Photon `district`, fallback `locality`) and a pure `derivePublicAreaFromSuggestion` helper (areaLabel = district || city) used by the component. Graceful fallback: a minimal City + 2-letter Country pair appears only when no pin is selected / provider is down, so publish never hard-blocks; postal code is now OPTIONAL (`validateEventPostalCode` returns null when absent — column is already nullable) and `areaLabel` defaults to city in the domain validator. Privacy held and covered by tests: the discoverable `events` row carries only city/district/countryCode — never the street address or precise coords. Slimmed the presentation to a single calm panel with trust framing. No migration needed. typecheck + full web suite (1005 pass / 12 skip) + domain suite (229 pass) + production build all green. Pushed to origin/main.
