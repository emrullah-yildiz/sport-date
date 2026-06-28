import { describe, expect, it } from "vitest";

import { publicEventLocation } from "./event";

describe("event location privacy", () => {
  it("never exposes the private meeting point in public discovery", () => {
    const result = publicEventLocation({
      city: "Bucharest",
      countryCode: "RO",
      approximateLatitude: 44.43,
      approximateLongitude: 26.1,
      privateMeetingPoint: "Court 2, private access code 1234",
    });

    expect(result).not.toHaveProperty("privateMeetingPoint");
    expect(result.city).toBe("Bucharest");
  });
});

