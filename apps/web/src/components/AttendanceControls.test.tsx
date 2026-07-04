import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AttendanceActionPanel from "./AttendanceActionPanel";
import AttendanceConfirmPrompt from "./AttendanceConfirmPrompt";

describe("attendance decision controls", () => {
  it("shows Approve and Cancel in the in-app two-hour prompt", () => {
    const html = renderToStaticMarkup(<AttendanceConfirmPrompt eventId="event-1" initialStatus="pending" />);

    expect(html).toContain(">Approve</button>");
    expect(html).toContain(">Cancel</button>");
  });

  it("uses the same action labels on tokenized email landing pages", () => {
    const common = { eventId: "event-1", token: "test-token", expired: false, initialResult: null } as const;

    expect(renderToStaticMarkup(<AttendanceActionPanel {...common} action="confirm" />)).toContain(">Approve</button>");
    expect(renderToStaticMarkup(<AttendanceActionPanel {...common} action="cancel" />)).toContain(">Cancel</button>");
  });
});
