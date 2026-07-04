"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { LocationSuggestion } from "@/lib/location-search";

type InitialPin = Readonly<{ address: string; latitude: number | null; longitude: number | null }>;

export default function AddressAutocomplete({ countryCode, initial, error }: { countryCode: string; initial?: InitialPin; error?: string }) {
  const [query, setQuery] = useState(initial?.address ?? "");
  const [selected, setSelected] = useState<LocationSuggestion | null>(initial?.latitude != null && initial.longitude != null ? {
    id: "existing", label: initial.address, address: initial.address, postalCode: "", city: "", countryCode: "", latitude: initial.latitude, longitude: initial.longitude,
  } : null);
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
        if (/^[a-z]{2}$/i.test(countryCode.trim())) params.set("countryCode", countryCode.trim());
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
  }, [query, countryCode, selected]);

  function choose(suggestion: LocationSuggestion) {
    setSelected(suggestion);
    setQuery(suggestion.address);
    setSuggestions([]);
    setActiveIndex(-1);
    setProviderUnavailable(false);
    setStatus(`Pin set at ${suggestion.label}.`);
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

  return <div className="address-autocomplete">
    <label htmlFor="address">Arrival address
      <input
        id="address"
        name="address"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setSelected(null); setSuggestions([]); setActiveIndex(-1); setProviderUnavailable(false); setStatus(""); }}
        onKeyDown={onKeyDown}
        required
        maxLength={300}
        placeholder="Start typing a venue or street address"
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
    {suggestions.length > 0 ? <ul id={listId} className="address-suggestions" role="listbox">
      {suggestions.map((suggestion, index) => <li key={suggestion.id} id={optionId(index)} role="option" aria-selected={index === activeIndex}>
        <button type="button" className={index === activeIndex ? "is-active" : undefined} tabIndex={-1} onMouseDown={(mouseEvent) => mouseEvent.preventDefault()} onClick={() => choose(suggestion)}><span aria-hidden="true">●</span><span>{suggestion.label}</span></button>
      </li>)}
    </ul> : null}
    <p id={`${listId}-status`} className={`address-search-status${selected ? " pin-set" : ""}`} role="status" aria-live="polite">{status || "Choose a result to set the exact map pin."}</p>
    {providerUnavailable
      ? <small className="address-fallback-hint">Location search is unavailable right now — you can still type the full address by hand and publish. Accepted guests will get directions to that address; add a pin later by editing the event once search is back.</small>
      : <small>Your search is sent to our <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>-based location provider. Your identity is not sent, and the selected pin stays private until acceptance.</small>}
  </div>;
}
