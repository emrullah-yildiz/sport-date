import PrimaryNav from "@/components/PrimaryNav";

// Route-level loading fallback for the coordination room. The room page is an async
// server component whose getEventRoom runs three sequential queries; without a
// loading.tsx the member sees the prior page frozen (client nav) or a blank frame
// (hard load) at the highest-commitment moment. This mirrors the /hosting loading
// pattern: the same shell (nav + hero eyebrow/heading) plus calm skeletons for the
// meeting-point and people panels, and a visually-hidden role="status" announcement.
//
// It shows NO member data, no venue/address, no participants, no authorization
// decision — the panels are honest placeholders. The skeleton shimmer is disabled
// under prefers-reduced-motion (see .room-skeleton in globals.css), and the shell
// keeps the room-grid dimensions so the real content swaps in without layout shift.
export default function EventRoomLoading() {
  return (
    <main className="room-page">
      <PrimaryNav />
      <header className="room-hero">
        <p className="eyebrow">Coordination room</p>
        <h1>Getting your room ready…</h1>
        <p>Bringing in your meeting point and who has a place.</p>
      </header>
      <section className="room-grid" aria-hidden="true">
        <article className="room-meeting room-skeleton-panel">
          <p className="panel-label">Where you are meeting</p>
          <div className="room-skeleton room-skeleton-line room-skeleton-title" />
          <div className="room-skeleton room-skeleton-line" />
          <div className="room-skeleton room-skeleton-line room-skeleton-line-short" />
        </article>
        <article className="room-people room-skeleton-panel">
          <p className="panel-label">Who has a place</p>
          <div className="room-skeleton room-skeleton-line room-skeleton-title" />
          <div className="room-skeleton-people">
            <div className="room-skeleton room-skeleton-chip" />
            <div className="room-skeleton room-skeleton-chip" />
            <div className="room-skeleton room-skeleton-chip" />
          </div>
        </article>
      </section>
      <p className="visually-hidden" role="status">Loading your room.</p>
    </main>
  );
}
