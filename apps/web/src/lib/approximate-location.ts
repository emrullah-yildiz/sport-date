// Pure derivation for the pre-acceptance "approximate area" spatial cue shown on the
// public event-detail page (CX-20260630-event-detail-approximate-location-no-spatial-cue).
//
// PRIVACY IS THE CONTROLLING CONSTRAINT. This module NEVER receives, produces, or
// exposes the exact venue. It works only on the SAME already-public, already-coarse
// data discovery exposes:
//   - the event's approximate PUBLIC coordinate (the 0.1° grid column, coarsened AGAIN
//     here defensively via `coarseCentreForEvent`), or an offline city-centre geocode
//     when that column is unset;
//   - the coarse area/city LABELS (`areaLabel`, `city`);
//   - the viewer's own free-text profile area, geocoded offline to a coarse centre.
//
// Everything it returns is deliberately region-level, not point-level:
//   - The visual is described as an AREA (a soft zone), never a pin. The blob offset it
//     produces is seeded from the COARSE cell only (a value already public and already
//     ~10km-quantised), so it encodes no sub-cell precision — it is a stable decorative
//     placement, not a location.
//   - The optional distance hint is SNAPPED to a wide band ("about 5 km", "about 10 km"…)
//     computed from two coarse centres, so it can reveal neither party's precise point.
//
// Kept free of `server-only` / DB / React imports so the whole privacy boundary is
// unit-testable in the node test environment.

import { coarseCentreForArea, coarseCentreForEvent, distanceKm, type Coordinates } from "@/lib/discovery-geo";

export type ApproximateAreaInput = Readonly<{
  areaLabel: string;
  city: string;
  approximateLatitude: number | null;
  approximateLongitude: number | null;
  /** The VIEWER's own free-text profile area — used only to derive a coarse distance band. */
  viewerArea?: string | null;
}>;

/**
 * The soft-zone placement within the 0..100 SVG viewBox. Derived ONLY from the coarse
 * (already-public, ~10km-quantised) cell, so it carries no sub-cell precision — it is a
 * stable, decorative position for the area blob, deliberately NOT a plotted point. Two
 * events in the same coarse cell share the same placement (they are indistinguishable at
 * this granularity, which is the point).
 */
export type ApproximateAreaPlacement = Readonly<{ cx: number; cy: number }>;

export type ApproximateAreaCue = Readonly<{
  /** The area headline, unchanged from the existing panel: "{areaLabel}, {city}". */
  label: string;
  /**
   * Whether we could resolve a coarse centre for the event at all. When false the caller
   * still renders the honest text; the stylised zone falls back to a centred, label-only
   * area (no derived placement) rather than inventing a location.
   */
  hasCentre: boolean;
  /** Decorative, coarse-seeded placement for the soft zone (region, never a point). */
  placement: ApproximateAreaPlacement;
  /**
   * A calm, coarse distance band from the viewer's area to the event's area, or null when
   * either side can't be resolved (unknown area / no coordinate) — in which case NO
   * distance is shown rather than a guessed one. Never a precise figure.
   */
  distanceHint: string | null;
  /**
   * The full accessible text equivalent for the visual (its `aria-label` / alt). States
   * plainly that this is an approximate area, not the exact venue.
   */
  ariaLabel: string;
}>;

// Distance bands (km). A coarse centre-to-centre distance is snapped UP to the nearest
// band so the hint stays deliberately approximate and can never be read as precise.
const DISTANCE_BANDS_KM = [5, 10, 25, 50, 100] as const;

/**
 * Snap a raw coarse distance to a wide human band. Returns null for a non-finite input.
 * Distances beyond the widest band read as "over 100 km" so we never print a precise
 * large figure either.
 */
export function coarseDistanceBandKm(distance: number): number | null {
  if (!Number.isFinite(distance) || distance < 0) return null;
  for (const band of DISTANCE_BANDS_KM) {
    if (distance <= band) return band;
  }
  return DISTANCE_BANDS_KM[DISTANCE_BANDS_KM.length - 1];
}

/**
 * Derive the coarse distance hint text between the viewer's area and the event's area,
 * or null when either can't be resolved. Both inputs are already grid-coarse, so the
 * result is area-to-area and is additionally snapped to a wide band — it exposes neither
 * party's precise location. When the two coarse centres coincide (same ~10km cell) we say
 * "in your area" rather than a misleading "0 km".
 */
export function approximateDistanceHint(
  viewerCentre: Coordinates | null,
  eventCentre: Coordinates | null,
): string | null {
  if (!viewerCentre || !eventCentre) return null;
  const raw = distanceKm(viewerCentre, eventCentre);
  if (raw < 2.5) return "About in your area";
  const band = coarseDistanceBandKm(raw);
  if (band === null) return null;
  if (raw > DISTANCE_BANDS_KM[DISTANCE_BANDS_KM.length - 1]) return "Over 100 km from your area";
  return `About ${band} km from your area`;
}

/**
 * A small deterministic hash of a string → 0..1. Used only to nudge the decorative zone
 * placement so different coarse cells don't all sit dead-centre; it consumes the coarse
 * cell string (already public, already ~10km-quantised), never a precise coordinate.
 */
function unitHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map the 32-bit value to [0, 1).
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Compute the decorative soft-zone placement from a COARSE centre. The centre is snapped
 * to the 0.1° grid already; we hash its string form to a small offset around the middle of
 * the viewBox so the zone reads as an area somewhere in-frame without ever encoding a
 * precise position. Centred fallback when there is no centre.
 */
export function approximateAreaPlacement(centre: Coordinates | null): ApproximateAreaPlacement {
  if (!centre) return { cx: 50, cy: 50 };
  const jx = unitHash(`${centre.latitude},${centre.longitude}:x`);
  const jy = unitHash(`${centre.longitude},${centre.latitude}:y`);
  // Keep the zone well within frame (35..65) so its wide radius never clips the edges and
  // never sits in a corner that could imply directionality toward a real place.
  return { cx: Number((35 + jx * 30).toFixed(2)), cy: Number((35 + jy * 30).toFixed(2)) };
}

/**
 * Build the full approximate-area cue for the event-detail "Before acceptance" panel from
 * coarse data only. Never reads or returns the precise venue.
 */
export function approximateAreaCue(input: ApproximateAreaInput): ApproximateAreaCue {
  const label = `${input.areaLabel}, ${input.city}`;
  const eventCentre = coarseCentreForEvent({
    approximateLatitude: input.approximateLatitude,
    approximateLongitude: input.approximateLongitude,
    city: input.city,
  });
  const viewerCentre = input.viewerArea ? coarseCentreForArea(input.viewerArea) : null;
  const distanceHint = approximateDistanceHint(viewerCentre, eventCentre);
  const placement = approximateAreaPlacement(eventCentre);

  const ariaLabel = distanceHint
    ? `Approximate area only: ${label}. ${distanceHint}. The exact venue is not shown.`
    : `Approximate area only: ${label}. The exact venue is not shown.`;

  return {
    label,
    hasCentre: eventCentre !== null,
    placement,
    distanceHint,
    ariaLabel,
  };
}
