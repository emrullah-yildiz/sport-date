"use client";

import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";

// Host-only inline map for the event create/edit location section
// (CX-20260706-event-location-map-picker). Shows the selected pin and lets the
// host tap the map or drag the marker to fine-tune the exact meeting spot.
//
// PRIVACY: this component renders ONLY in the host's create/edit flow. The exact
// pin never reaches discovery, the public invite, or the poster — those surfaces
// carry the coarse approximate area alone (see approximate-location.ts and the
// public-surface boundary tests).
//
// LAZY BY DESIGN: Leaflet's JS is `import()`ed and the map (and therefore the
// first OpenStreetMap tile request) is only created once the container is
// actually on screen, so no tile is fetched before the host reaches and uses the
// location step. Server rendering emits only an empty placeholder — no tile URL
// exists in the HTML.

export const OSM_TILE_URL_TEMPLATE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// Required by the OSM tile usage policy; Leaflet renders it as the on-map
// attribution control, always visible.
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

// Close enough to tell entrances/courts apart, without starting zoomed into a wall.
const PICK_ZOOM = 17;
// Coordinate-equality tolerance (~0.1 m) so echoing a pick back through props
// never re-centers the map the host just positioned.
const COORDINATE_EPSILON = 1e-6;

type Props = Readonly<{
  latitude: number;
  longitude: number;
  /** Called with the tapped/dragged spot. Address search stays the primary path. */
  onPick: (latitude: number, longitude: number) => void;
}>;

export default function EventLocationMapPicker({ latitude, longitude, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // Latest callback/position without re-running the boot effect (the map must be
  // created exactly once, then mutated). Synced in an effect, not during render.
  const onPickRef = useRef(onPick);
  const positionRef = useRef({ latitude, longitude });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
    positionRef.current = { latitude, longitude };
  }, [onPick, latitude, longitude]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    async function boot() {
      if (cancelled || mapRef.current) return;
      // Dynamic import keeps Leaflet out of the form's initial bundle; nothing
      // Leaflet (JS or tiles) loads until the section is visible.
      const imported = await import("leaflet");
      // CJS interop: bundlers expose Leaflet's UMD exports on `.default`; fall
      // back to the namespace itself if a future ESM build drops it.
      const leaflet = imported.default ?? imported;
      const target = containerRef.current;
      if (cancelled || mapRef.current || !target) return;

      const initial = positionRef.current;
      const map = leaflet.map(target, {
        center: [initial.latitude, initial.longitude],
        zoom: PICK_ZOOM,
        // Mouse-wheel zoom on, per owner request (2026-07-06) — alongside the
        // +/- buttons, double-click, and pinch.
        scrollWheelZoom: true,
      });
      leaflet.tileLayer(OSM_TILE_URL_TEMPLATE, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);

      // A CSS-drawn brand pin (divIcon) instead of Leaflet's default image icon:
      // no bundled marker PNGs to resolve, and it matches the form's styling.
      const marker = leaflet.marker([initial.latitude, initial.longitude], {
        draggable: true,
        autoPan: true,
        // The map is a pointer enhancement; the address search remains the
        // keyboard-accessible way to set the pin.
        keyboard: false,
        icon: leaflet.divIcon({
          className: "event-map-pin",
          html: '<span class="event-map-pin-dot" aria-hidden="true"></span>',
          iconSize: [26, 26],
          iconAnchor: [13, 24],
        }),
      }).addTo(map);

      map.on("click", (clickEvent) => {
        marker.setLatLng(clickEvent.latlng);
        onPickRef.current(clickEvent.latlng.lat, clickEvent.latlng.lng);
      });
      marker.on("dragend", () => {
        const spot = marker.getLatLng();
        onPickRef.current(spot.lat, spot.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);
    }

    // Boot only once the container is actually on screen. Fall back to booting
    // immediately when IntersectionObserver is unavailable.
    if (typeof IntersectionObserver === "undefined") {
      void boot();
      return () => {
        cancelled = true;
        mapRef.current?.remove();
        mapRef.current = null;
        markerRef.current = null;
      };
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void boot();
      }
    }, { rootMargin: "96px" });
    observer.observe(container);
    return () => {
      cancelled = true;
      observer.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Follow the selection: choosing a different address suggestion moves the
  // marker and re-centers. Echoes of the host's own map pick are within epsilon
  // and deliberately ignored (no jarring re-center mid-fine-tune).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const current = marker.getLatLng();
    if (Math.abs(current.lat - latitude) < COORDINATE_EPSILON && Math.abs(current.lng - longitude) < COORDINATE_EPSILON) return;
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], Math.max(map.getZoom(), PICK_ZOOM));
  }, [latitude, longitude]);

  return <div className="event-location-map">
    <div
      ref={containerRef}
      className="event-location-map-canvas"
      role="application"
      aria-label="Map of the selected meeting spot. Tap the map or drag the pin to fine-tune the exact spot."
    >
      {ready ? null : <p className="event-location-map-placeholder">Map loads when you scroll here.</p>}
    </div>
    <p className="event-location-map-hint">Tap the map or drag the pin to fine-tune the exact meeting spot — it stays private until you accept someone.</p>
  </div>;
}
