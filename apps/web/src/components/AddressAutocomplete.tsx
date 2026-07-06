"use client";

import { useEffect, useId, useRef, useState } from "react";

import EventLocationMapPicker from "@/components/EventLocationMapPicker";
import { derivePublicAreaFromSuggestion, pinnedSuggestion, roundPinCoordinate, type LocationSuggestion } from "@/lib/location-search";

// The precise pin plus the coarse public fields derived from it. On edit these are
// prefilled from the stored event so the happy path (a pin already set) renders the
// slim 3-input shape without asking the host to re-pick.
type InitialPin = Readonly<{
  address: string;
  latitude: number | null;
  longitude: number | null;
  city?: string;
  countryCode?: string;
  areaLabel?: string;
  postalCode?: string | null;
}>;

// The coarse, PUBLIC area derived from the selected pin. Never contains the street
// address or the precise coordinates — only city, sub-city district, country, and
// the (private) postal code that rides with the pin.
type DerivedArea = { city: string; countryCode: string; areaLabel: string; postalCode: string };

export default function AddressAutocomplete({ initial, error }: { initial?: InitialPin; error?: string }) {
  const [query, setQuery] = useState(initial?.address ?? "");
  const [selected, setSelected] = useState<LocationSuggestion | null>(initial?.latitude != null && initial.longitude != null ? {
    id: "existing", label: initial.address, address: initial.address, postalCode: initial.postalCode ?? "", city: initial.city ?? "", district: "", countryCode: initial.countryCode ?? "", latitude: initial.latitude, longitude: initial.longitude,
  } : null);
  // The derived coarse public area. Set from a chosen suggestion, prefilled from the
  // stored event on edit, and cleared when the host clears the selection so the
  // hidden inputs only ever reflect the CURRENTLY selected pin.
  const [area, setArea] = useState<DerivedArea>({
    city: initial?.city ?? "",
    countryCode: initial?.countryCode ?? "",
    areaLabel: initial?.areaLabel ?? "",
    postalCode: initial?.postalCode ?? "",
  });
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [status, setStatus] = useState("");
  // Index of the keyboard-highlighted option, or -1 when none is active. Powers
  // `aria-activedescendant` so arrow keys move a visible highlight without moving
  // DOM focus off the input (the Uber-style combobox pattern).
  const [activeIndex, setActiveIndex] = useState(-1);
  // True once the provider failed for the current query, so we can reassure the
  // host that they can still type the address by hand and publish (graceful
  // fallback — a geocoder outage must never block event creation).
  const [providerUnavailable, setProviderUnavailable] = useState(false);
  const requestNumber = useRef(0);
  // Separate race counter for map-pick reverse lookups (a host can tap/drag
  // quickly); only the latest pick may write the address fields.
  const reverseRequestNumber = useRef(0);
  const listId = useId();

  useEffect(() => {
    if (selected && query === selected.address) return;
    if (query.trim().length < 3) return;
    const current = ++requestNumber.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("Searching locations…");
      try {
        const params = new URLSearchParams({ q: query.trim() });
        // Bias by the coarse country the host has confirmed (from a prior pick or
        // the fallback field). Absent on a first search — Photon still resolves.
        if (/^[a-z]{2}$/i.test(area.countryCode.trim())) params.set("countryCode", area.countryCode.trim());
        const response = await fetch(`/api/locations/search?${params}`, { signal: controller.signal });
        const result = await response.json() as { suggestions?: LocationSuggestion[]; error?: string };
        if (current !== requestNumber.current) return;
        if (!response.ok) throw new Error(result.error || "Location search failed.");
        setProviderUnavailable(false);
        setSuggestions(result.suggestions ?? []);
        setActiveIndex(-1);
        setStatus((result.suggestions?.length ?? 0) ? `${result.suggestions!.length} locations found.` : "No matching locations found. Try including the city or venue name.");
      } catch (caught) {
        if (controller.signal.aborted || current !== requestNumber.current) return;
        setSuggestions([]);
        setActiveIndex(-1);
        setProviderUnavailable(true);
        setStatus(caught instanceof Error ? caught.message : "Location search failed.");
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, area.countryCode, selected]);

  function choose(suggestion: LocationSuggestion) {
    setSelected(suggestion);
    setQuery(suggestion.address);
    // Derive the coarse public area from the pin (city + district). The precise
    // street address stays in the visible `address` field only; the derivation
    // never carries it or the coordinates.
    setArea(derivePublicAreaFromSuggestion(suggestion));
    setSuggestions([]);
    setActiveIndex(-1);
    setProviderUnavailable(false);
    setStatus(`Pin set at ${suggestion.label}.`);
  }

  // The host tapped the map or dragged the marker (CX-20260706). The tapped
  // coordinates become the pin IMMEDIATELY — they are the host's intent and must
  // survive even if the address lookup below fails — then the reverse-geocode
  // proxy (same data-minimization as the forward search) refreshes the address
  // text and the coarse public area. The typed venue name lives in a separate
  // field and is never touched.
  async function applyMapPick(pickedLatitude: number, pickedLongitude: number) {
    const latitude = roundPinCoordinate(pickedLatitude);
    const longitude = roundPinCoordinate(pickedLongitude);
    setSelected((current) => (current ? pinnedSuggestion(current, latitude, longitude) : current));
    setStatus("Exact spot updated. Looking up the address…");
    const current = ++reverseRequestNumber.current;
    try {
      const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
      const response = await fetch(`/api/locations/reverse?${params}`);
      const result = await response.json() as { suggestion?: LocationSuggestion | null; error?: string };
      if (current !== reverseRequestNumber.current) return;
      if (!response.ok) throw new Error(result.error || "Address lookup failed.");
      if (!result.suggestion) {
        setStatus("Exact spot updated. No address found right there — the address text stays as typed.");
        return;
      }
      const suggestion = pinnedSuggestion(result.suggestion, latitude, longitude);
      setSelected(suggestion);
      setQuery(suggestion.address);
      // Refresh the coarse public area from the new spot, but never let a sparse
      // reverse result WIPE a coarse field the host already has — a missing city
      // would otherwise drop the hidden inputs and block publishing.
      setArea((currentArea) => {
        const derived = derivePublicAreaFromSuggestion(suggestion);
        return {
          city: derived.city || currentArea.city,
          countryCode: derived.countryCode || currentArea.countryCode,
          areaLabel: derived.areaLabel || currentArea.areaLabel,
          postalCode: derived.postalCode || currentArea.postalCode,
        };
      });
      setStatus(`Pin moved to ${suggestion.label}.`);
    } catch (caught) {
      if (current !== reverseRequestNumber.current) return;
      const message = caught instanceof Error ? caught.message : "Address lookup failed.";
      setStatus(`Exact spot updated. ${message} The address text stays as typed.`);
    }
  }

  function clearSelection() {
    setSelected(null);
    setSuggestions([]);
    setActiveIndex(-1);
    setProviderUnavailable(false);
    setStatus("");
    // Clear the derived area with the pin so the hidden inputs never carry a coarse
    // area that no longer matches the selection.
    setArea({ city: "", countryCode: "", areaLabel: "", postalCode: "" });
  }

  function onKeyDown(keyEvent: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (keyEvent.key === "ArrowDown") {
      keyEvent.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (keyEvent.key === "ArrowUp") {
      keyEvent.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (keyEvent.key === "Enter" && activeIndex >= 0) {
      keyEvent.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (keyEvent.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }

  const optionId = (index: number) => `${listId}-option-${index}`;

  // The coarse area is complete only when a pin is selected AND it yielded a city +
  // country. Otherwise surface the minimal fallback so publish is never hard-blocked
  // by a geocoder outage or a manually-typed address (city defaults the areaLabel).
  const areaComplete = Boolean(selected) && area.city.trim().length > 0 && /^[A-Za-z]{2}$/.test(area.countryCode.trim());
  const areaLabelValue = area.areaLabel.trim() || area.city.trim();

  return <div className="address-autocomplete">
    <label htmlFor="address">Location
      <input
        id="address"
        name="address"
        value={query}
        onChange={(event) => { setQuery(event.target.value); clearSelection(); }}
        onKeyDown={onKeyDown}
        required
        maxLength={300}
        placeholder="Search a venue or street address, then choose a result"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={`${listId}-status${error ? " address-error" : ""}`}
      />
      {error ? <span id="address-error" className="field-error">{error}</span> : null}
    </label>
    <input type="hidden" name="latitude" value={selected?.latitude ?? ""} />
    <input type="hidden" name="longitude" value={selected?.longitude ?? ""} />
    {/* Derived PUBLIC area label (city + district) and the private postal code that
        rides with the pin. Coarse only — never the street address or precise coords. */}
    <input type="hidden" name="areaLabel" value={areaLabelValue} />
    <input type="hidden" name="postalCode" value={area.postalCode} />
    {suggestions.length > 0 ? <ul id={listId} className="address-suggestions" role="listbox">
      {suggestions.map((suggestion, index) => <li key={suggestion.id} id={optionId(index)} role="option" aria-selected={index === activeIndex}>
        <button type="button" className={index === activeIndex ? "is-active" : undefined} tabIndex={-1} onMouseDown={(mouseEvent) => mouseEvent.preventDefault()} onClick={() => choose(suggestion)}><span aria-hidden="true">●</span><span>{suggestion.label}</span></button>
      </li>)}
    </ul> : null}
    {/* Host-only map preview + fine-tune of the PRIVATE pin. Rendered only once a
        pin exists (a chosen suggestion, or the stored pin on edit); Leaflet and
        the first tile load lazily when the map scrolls into view. */}
    {selected ? <EventLocationMapPicker latitude={selected.latitude} longitude={selected.longitude} onPick={applyMapPick} /> : null}
    <p id={`${listId}-status`} className={`address-search-status${selected ? " pin-set" : ""}`} role="status" aria-live="polite">{status || "Choose a result to set the exact map pin — the city and area fill in automatically."}</p>
    {areaComplete
      ? <p className="address-derived-area">Discovery will show <strong>{areaLabelValue}{area.countryCode ? `, ${area.countryCode}` : ""}</strong> — the approximate area only. Your exact pin stays private until you accept someone.</p>
      : <div className="location-coarse-fallback">
          <p className="location-coarse-fallback-lede">No exact result selected yet. So people can still find the event, tell us just the approximate area — no street address needed here.</p>
          <div className="location-coarse-fields">
            <label htmlFor="city">City<input id="city" name="city" value={area.city} onChange={(event) => setArea((current) => ({ ...current, city: event.target.value }))} required maxLength={100} placeholder="București" /></label>
            <label htmlFor="countryCode">Country code<input id="countryCode" name="countryCode" value={area.countryCode} onChange={(event) => setArea((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))} required minLength={2} maxLength={2} placeholder="RO" /></label>
          </div>
        </div>}
    {providerUnavailable
      ? <small className="address-fallback-hint">Location search is unavailable right now — you can still type the full address by hand and publish. Accepted guests will get directions to that address; add a pin later by editing the event once search is back.</small>
      : <small>Your search is sent to our <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>-based location provider. Your identity is not sent, and the selected pin stays private until acceptance.</small>}
    {areaComplete ? <>
      <input type="hidden" name="city" value={area.city} />
      <input type="hidden" name="countryCode" value={area.countryCode} />
    </> : null}
  </div>;
}
