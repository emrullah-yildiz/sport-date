import Link from "next/link";
import { redirect } from "next/navigation";

import AccountMenu from "@/components/AccountMenu";
import CreateEventForm from "@/components/CreateEventForm";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Host an event — Sport Date" };

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <main className="new-event-page">
      <nav className="profile-nav"><Link href="/profile" className="logo">Sport Date</Link><div className="nav-actions"><span>Hosting as {user.firstName}</span><AccountMenu firstName={user.firstName} /></div></nav>
      <header className="new-event-header"><p className="eyebrow">Create a real reason to meet</p><h1>Host the kind of game you would actually show up for.</h1><p>Warm expectations, clear logistics, and a private meeting point—held separately from discovery by design.</p></header>
      <section className="host-principles">
        <div>
          <p className="panel-label">Before you publish</p>
          <h2>Hosting here means clarity, repeatability, and no false authority.</h2>
          <p>Sport Date does not treat host status as safety certification. Publish only a format you can actually run, with real expectations and a real cancellation plan.</p>
        </div>
        <div className="host-principles-list">
          <article><strong>Make the format legible</strong><span>Set the level, start, end, price expectations, and who this is for.</span></article>
          <article><strong>Protect precise location</strong><span>Exact meeting details stay inside accepted-member access until the right moment.</span></article>
          <article><strong>Do not pressure people</strong><span>No alcohol-led pressure, off-platform demands, retaliation, or romantic coercion.</span></article>
          <article><strong>Know the boundary</strong><span>You are hosting a sport encounter, not acting as a moderator, employee, or emergency service.</span></article>
        </div>
        <Link href="/hosting-guidelines">Read the Hosting Guidelines</Link>
      </section>
      <CreateEventForm />
    </main>
  );
}
