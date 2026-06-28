"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [submitting, setSubmitting] = useState(false);

  async function logout() {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return <button className="profile-logout" type="button" onClick={logout} disabled={submitting}>{submitting ? "Signing out…" : "Sign out"}</button>;
}

