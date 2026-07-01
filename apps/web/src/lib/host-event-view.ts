/**
 * Pure helpers for the host event page's post-publish success state.
 *
 * Publishing an event redirects to `/events/{id}?published=1`. When that flag is
 * present we surface a calm "it's live" confirmation linking to the public
 * invitation (approximate area only), the hosting hub, and a share action. The
 * share/view links deliberately point at the discovery view so a host never
 * shares a URL that exposes the precise meeting point.
 */

export type HostEventViewState = {
  justPublished: boolean;
  publicInvitationPath: string;
  managePath: string;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function resolveHostEventView(
  eventId: string,
  searchParams: Record<string, string | string[] | undefined>,
): HostEventViewState {
  return {
    justPublished: firstValue(searchParams.published) === "1",
    publicInvitationPath: `/discover/events/${eventId}`,
    managePath: "/hosting",
  };
}
