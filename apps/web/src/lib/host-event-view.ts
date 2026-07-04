/**
 * Pure helpers for the host event page's post-publish success state.
 *
 * Publishing an event redirects to `/events/{id}?published=1`. When that flag is
 * present we surface a calm "it's live" confirmation linking to the public
 * invitation (approximate area only), the hosting hub, and a share action.
 *
 * Two distinct public-safe paths (CX-20260704):
 * - `publicInvitationPath` (`/discover/events/{id}`) — the AUTHENTICATED member
 *   preview the host opens to see the invitation as members do.
 * - `shareInvitePath` (`/e/{id}`) — the UNAUTHENTICATED share link the host copies
 *   for people outside the product. It carries even less than the member view
 *   (structured, discovery-safe facts only) and previews with a rich OG card.
 * Neither path can expose the precise meeting point.
 */

export type HostEventViewState = {
  justPublished: boolean;
  publicInvitationPath: string;
  shareInvitePath: string;
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
    shareInvitePath: `/e/${eventId}`,
    managePath: "/hosting",
  };
}
