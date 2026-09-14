import Link from "next/link";
import { redirect } from "next/navigation";

import PrimaryNav from "@/components/PrimaryNav";
import CreateEventForm from "@/components/CreateEventForm";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Host an event" };

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <main className="new-event-page">
      <PrimaryNav firstName={user.firstName} current="host" action={<span>Hosting as {user.firstName}</span>} />
      <header className="new-event-header"><p className="eyebrow">Bring people together</p><h1>Make a plan.</h1><p>Choose a sport, set the details, invite good company.</p><Link href="/hosting-guidelines">Hosting guide</Link></header>
      <CreateEventForm />
    </main>
  );
}
