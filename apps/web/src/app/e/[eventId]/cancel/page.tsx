import type { Metadata } from "next";

import AttendanceLanding from "@/components/AttendanceLanding";

export const metadata: Metadata = {
  title: "Can't make it?",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function CancelAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  return (
    <AttendanceLanding action="cancel" eventId={eventId} token={first(query.t)} stateParam={first(query.state) || null} />
  );
}
