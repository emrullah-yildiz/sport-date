"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { coarsenCoordinates, RADIUS_OPTIONS_KM } from "@/lib/discovery-geo";

// Strictly opt-in "Use my current location" for /discover
// (CX-20260701-discover-geo-radius-and-use-my-location).
//
// PRIVACY: the browser's precise position NEVER leaves the device intact. The moment
// we receive it we COARSEN it to the same ~10km area grid the whole feature uses
// (`coarsenCoordinates`), then pass only that coarse pair as ephemeral query params
// for THIS search. It is not persisted anywhere — not in storage, not on the server,
// not in the member's profile. Reloading without those params (or declining the
// browser prompt) simply falls back to the profile-area default. A member can always
// use discovery without ever granting this.

type Status = "idle" | "locating" | "error";

export default function UseMyLocationControl({ defaultRadiusKm }: { defaultRadiusKm?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const usingLocation = searchParams.get("lat") !== null && searchParams.get("lng") !== null;

  function buildHref(next: URLSearchParams): string {
    const query = next.toString();
    return query ? `/discover?${query}` : "/discover";
  }

  function requestLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("error");
      setMessage("Your browser can't share a location. You can still search by your profile area.");
      return;
    }
    setStatus("locating");
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Coarsen IMMEDIATELY, on-device, before the value is ever put in a URL.
        const coarse = coarsenCoordinates(position.coords.latitude, position.coords.longitude);
        if (!coarse) {
          setStatus("error");
          setMessage("That location didn't look valid. You can still search by your profile area.");
          return;
        }
        const next = new URLSearchParams(searchParams.toString());
        next.set("lat", String(coarse.latitude));
        next.set("lng", String(coarse.longitude));
        // Ensure a distance filter is active so the coarse centre actually does something.
        if (!next.get("radius")) next.set("radius", String(defaultRadiusKm ?? RADIUS_OPTIONS_KM[1]));
        // A specific typed city would override the area centre — clear it so "my location" leads.
        next.delete("city");
        next.delete("near");
        setStatus("idle");
        router.push(buildHref(next));
      },
      (geErr) => {
        setStatus("error");
        setMessage(
          geErr.code === geErr.PERMISSION_DENIED
            ? "No problem — location stays off. You're searching by your profile area instead."
            : "Couldn't get a location just now. You can still search by your profile area.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function clearLocation() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("lat");
    next.delete("lng");
    setStatus("idle");
    setMessage("");
    router.push(buildHref(next));
  }

  return (
    <div className="use-my-location">
      {usingLocation ? (
        <button type="button" className="discover-broaden discover-broaden-secondary" onClick={clearLocation}>
          Stop using my location
        </button>
      ) : (
        <button
          type="button"
          className="discover-broaden"
          onClick={requestLocation}
          disabled={status === "locating"}
          aria-busy={status === "locating"}
        >
          {status === "locating" ? "Getting your area…" : "Use my current location"}
        </button>
      )}
      <p className="use-my-location-consent">
        {usingLocation
          ? "Using your approximate area for this search only. It's rounded to a wide area, never your exact spot, and isn't saved."
          : "Optional. We round it to a wide area (never your exact spot), use it for this search only, and never save it. You can search without it."}
      </p>
      {status === "error" && message ? (
        <p className="use-my-location-status" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
