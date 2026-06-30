"use client";

import { useEffect, useState } from "react";

type Device = {
  id: string; deviceName: string; lastUsedAt: string; refreshExpiresAt: string;
  revokedAt: string | null; active: boolean;
};

export default function MobileSessionControls() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  async function load() {
    setState("loading");
    try {
      const response = await fetch("/api/account/mobile-sessions", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Device sessions could not be loaded.");
      setDevices(result.devices); setState("ready");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Device sessions could not be loaded."); setState("error"); }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/account/mobile-sessions", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Device sessions could not be loaded.");
        return result.devices as Device[];
      })
      .then((result) => { if (active) { setDevices(result); setState("ready"); } })
      .catch((error: unknown) => { if (active) { setMessage(error instanceof Error ? error.message : "Device sessions could not be loaded."); setState("error"); } });
    return () => { active = false; };
  }, []);
  async function revoke(sessionId: string) {
    setMessage("");
    try {
      const response = await fetch("/api/account/mobile-sessions", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Device could not be revoked.");
      setMessage("Device session revoked. Its next request or refresh will require sign-in.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Device could not be revoked."); }
  }
  return <section className="mobile-session-panel" aria-labelledby="mobile-sessions-title">
    <p className="panel-label">Account security</p><h2 id="mobile-sessions-title">Signed-in mobile devices</h2>
    <p>Review native sessions without exposing their access or refresh credentials.</p>
    {state === "loading" ? <p>Loading device sessions...</p> : null}
    {state === "error" ? <button type="button" onClick={() => void load()}>Try again</button> : null}
    {state === "ready" && devices.length === 0 ? <p>No Sport Date mobile app is signed in to your account. Your browser sessions are managed above.</p> : null}
    {state === "ready" ? <div className="mobile-device-list">{devices.map((device) => <article key={device.id}>
      <div><strong>{device.deviceName}</strong><span>{device.active ? "Active" : device.revokedAt ? "Revoked" : "Expired"}</span></div>
      <small>Last used {new Date(device.lastUsedAt).toLocaleString()} · refresh expires {new Date(device.refreshExpiresAt).toLocaleDateString()}</small>
      {device.active ? <button type="button" onClick={() => void revoke(device.id)}>Revoke device</button> : null}
    </article>)}</div> : null}
    {message ? <p role="status" className="mobile-session-message">{message}</p> : null}
  </section>;
}
