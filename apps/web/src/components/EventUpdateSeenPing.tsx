"use client";

import { useEffect, useState } from "react";

export default function EventUpdateSeenPing({ eventId, updateId, alreadySeen }: { eventId: string; updateId: string; alreadySeen: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(alreadySeen ? "done" : "idle");

  useEffect(() => {
    if (alreadySeen) return;
    let active = true;

    async function markSeen() {
      setStatus("sending");
      try {
        const response = await fetch(`/api/events/${eventId}/updates/${updateId}/seen`, { method: "POST" });
        if (!response.ok) throw new Error("Could not mark the update as seen.");
        if (active) setStatus("done");
      } catch {
        if (active) setStatus("error");
      }
    }

    void markSeen();
    return () => { active = false; };
  }, [alreadySeen, eventId, updateId]);

  if (status === "sending") return <small>Marking the newest host update as seen…</small>;
  if (status === "done") return <small>The host can see that you opened the latest update.</small>;
  if (status === "error") return <small>We could not confirm that you opened the newest update yet. Refresh to try again.</small>;
  return <small>Opening this room marks the newest host update as seen.</small>;
}
