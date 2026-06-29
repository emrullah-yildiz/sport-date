import Link from "next/link";
import { redirect } from "next/navigation";

import CreateEventForm from "@/components/CreateEventForm";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Host an event — Sport Date" };

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <main className="new-event-page">
      <nav className="profile-nav"><Link href="/profile" className="logo">Sport Date</Link><span>Hosting as {user.firstName}</span></nav>
      <header className="new-event-header"><p className="eyebrow">Create a real reason to meet</p><h1>Host the kind of game you would actually show up for.</h1><p>Warm expectations, clear logistics, and a private meeting point—held separately from discovery by design.</p></header>
      <CreateEventForm />
    </main>
  );
}

