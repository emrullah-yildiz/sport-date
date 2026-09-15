import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import EventTutorials from "./EventTutorials";
import AddressAutocomplete from "./AddressAutocomplete";
import CreateEventForm from "./CreateEventForm";
import JoinRequestControls from "./JoinRequestControls";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("on-demand event tutorials", () => {
  it("starts at a quiet choice and mounts neither data-entry flow until selected", () => {
    const html = renderToStaticMarkup(<EventTutorials onClose={() => {}} />);
    expect(html).toContain("Host an event");
    expect(html).toContain("Join an event");
    expect(html).toContain("Practice walkthrough. Nothing is published or sent.");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<textarea");
  });

  it("keeps participation markup identical to the real initial flow", () => {
    const real = renderToStaticMarkup(<JoinRequestControls eventId="event" request={null} />);
    const tutorial = renderToStaticMarkup(<JoinRequestControls eventId="practice" request={null} tutorial={{ onStepChange: () => {} }} />);
    expect(tutorial).toBe(real);
  });

  it("uses the same hosting steps and preserves real empty defaults", () => {
    const real = renderToStaticMarkup(<CreateEventForm />);
    const tutorial = renderToStaticMarkup(<CreateEventForm tutorial={{ startsAt: "2099-01-01T18:00", onStepChange: () => {}, onComplete: () => {} }} />);
    for (const html of [real, tutorial]) {
      expect(html).toContain("Event creation progress");
      expect(html).toContain("What are you planning?");
      expect(html).toContain("Review your invitation");
    }
    expect(real).not.toContain('value="An easy evening rally"');
    expect(tutorial).toContain('value="An easy evening rally"');
  });

  it("never mounts the remote map in a tutorial, even with a selected pin", () => {
    const initial = { address: "1 Example Walk", latitude: 0, longitude: 0, city: "Example City", countryCode: "RO" };
    const html = renderToStaticMarkup(<AddressAutocomplete tutorial initial={initial} />);
    expect(html).not.toContain("event-location-map");
    expect(html).not.toContain("Your search is sent");
    expect(html).toContain("Search stays in this walkthrough");
    expect(renderToStaticMarkup(<AddressAutocomplete initial={initial} />)).toContain("event-location-map");
  });
});
