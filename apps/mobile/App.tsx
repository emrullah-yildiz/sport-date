import {
  calculateMovementProgress,
  FEEDBACK_CATEGORIES,
  FEEDBACK_SEVERITIES,
  SAFETY_REPORT_CATEGORIES,
  type EventReflectionInput,
  type FeedbackCategory,
  type FeedbackSeverity,
  type FeedbackTicketInput,
  type SafetyReportCategory,
} from "@sport-date/domain";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { loginMobile, logoutMobile, mobileApiConfigured, restoreMobileMember } from "./src/auth/session";
import { blockMobileMember, cancelMobileEventRequest, decideMobileHostRequest, loadMobileDevices, loadMobileFeedback, loadMobileProduct, loadMobileRoom, markMobileEventUpdateSeen, reportMobileSafety, requestMobileEvent, revokeMobileDevice, saveMobileEventUpdateIntent, saveMobileReflection, submitMobileFeedback, type MobileDeviceSession, type MobileFeedbackTicket, type MobileHostRequest, type MobileMemberEvent, type MobileProductData, type MobileRoom } from "./src/api/product";

type Tab = "discover" | "event" | "arc" | "feedback";

const events = [
  { icon: "↗", sport: "Tennis", place: "Tineretului · approximate area", time: "Today · 19:00", color: "#dff59e" },
  { icon: "≈", sport: "Morning run", place: "Herăstrău · approximate area", time: "Saturday · 08:30", color: "#d7e7ff" },
  { icon: "◆", sport: "Bouldering", place: "Grozăvești · approximate area", time: "Sunday · 16:00", color: "#ffdcd2" },
];

const attendanceChoices: Array<{ value: EventReflectionInput["attendance"]; label: string }> = [
  { value: "attended", label: "I attended" },
  { value: "left_early", label: "I left early" },
  { value: "did_not_attend", label: "I did not attend" },
];
const againChoices: Array<{ value: EventReflectionInput["wouldJoinAgain"]; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const MOBILE_EVENT_UPDATE_FIELD_LABELS: Record<string, string> = {
  sport: "sport",
  title: "title",
  description: "description",
  startsAt: "start time",
  durationMinutes: "duration",
  capacity: "capacity",
  language: "language",
  experienceLevels: "experience levels",
  participantAgeRange: "age range",
  publicLocation: "public area",
  privateLocation: "exact venue",
  arrivalInstructions: "arrival instructions",
};

function getHostRecoveryGuidance(
  counts: { stillIn: number; unsure: number; cannotMake: number },
  pendingRequestCount: number,
) {
  if (counts.cannotMake === 0 && counts.unsure === 0) {
    return {
      title: "The critical change has not shaken the group yet.",
      body: "Keep watching the room and only make further edits if the plan materially changes again.",
      replacement: pendingRequestCount > 0 ? `${pendingRequestCount} pending ${pendingRequestCount === 1 ? "request is" : "requests are"} still waiting if you later need to rebuild the group.` : null,
    };
  }

  if (counts.stillIn === 0 && counts.unsure === 0 && counts.cannotMake > 0) {
    return {
      title: "No accepted member currently plans to come.",
      body: "This invitation may no longer be real. Cancel early or move the plan to another day instead of hoping people still arrive.",
      replacement: pendingRequestCount > 0 ? `Even with ${pendingRequestCount} pending ${pendingRequestCount === 1 ? "request" : "requests"}, only continue if you are ready to rebuild the plan honestly around a new group.` : null,
    };
  }

  if (counts.stillIn + counts.unsure < 2 && counts.cannotMake > 0) {
    return {
      title: "The group may have dropped below a viable size.",
      body: "Decide quickly whether to cancel, substantially reshape the plan, or host only if the remaining group is still honest and safe.",
      replacement: pendingRequestCount > 0 ? `${pendingRequestCount} pending ${pendingRequestCount === 1 ? "request is" : "requests are"} available if you need replacements, but accept only people who still fit the changed plan.` : null,
    };
  }

  if (counts.cannotMake > 0) {
    return {
      title: "Some people dropped after the critical change.",
      body: "The event may still work, but treat the remaining group as the new reality. Do not lower capacity below accepted seats; wait for members to leave or accept replacements honestly.",
      replacement: pendingRequestCount > 0 ? `${pendingRequestCount} pending ${pendingRequestCount === 1 ? "request is" : "requests are"} already in the funnel, so review those before widening the invitation again.` : "There are no pending requests waiting, so any rebuild depends on the current accepted group or future discovery.",
    };
  }

  return {
    title: "Some accepted members are unsure after the change.",
    body: "Use the room as your decision surface and avoid assuming attendance until the unsure members answer more clearly or the plan changes again.",
    replacement: pendingRequestCount > 0 ? `${pendingRequestCount} pending ${pendingRequestCount === 1 ? "request is" : "requests are"} available if the unsure group later falls through.` : null,
  };
}

function summarizeHostRequestQueue(requests: MobileHostRequest[]) {
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const acceptedCount = requests.filter((request) => request.status === "accepted").length;
  const closedCount = requests.filter((request) => request.status === "declined" || request.status === "cancelled").length;
  const finalSkipPendingCount = requests.filter((request) => request.status === "pending" && request.skipCount >= 2).length;

  if (pendingCount === 0) {
    return {
      pendingCount,
      acceptedCount,
      closedCount,
      pendingHeadline: "No pending requests are waiting right now.",
      pendingBody: null as string | null,
    };
  }

  if (pendingCount === 1) {
    return {
      pendingCount,
      acceptedCount,
      closedCount,
      pendingHeadline: "1 pending request is ready for a decision.",
      pendingBody: finalSkipPendingCount > 0
        ? "This request is already on its final skip, so the next pass will close it quietly."
        : "Review this request here before widening discovery again.",
    };
  }

  return {
    pendingCount,
    acceptedCount,
    closedCount,
    pendingHeadline: `${pendingCount} pending requests are ready for review.`,
    pendingBody: finalSkipPendingCount > 0
      ? `${finalSkipPendingCount} ${finalSkipPendingCount === 1 ? "request is" : "requests are"} already on the final skip, so the next pass would close ${finalSkipPendingCount === 1 ? "it" : "them"} quietly.`
      : "Work through these requests before widening discovery again.",
  };
}

export default function App() {
  const configured = mobileApiConfigured();
  const [authState, setAuthState] = useState<"checking" | "signed_out" | "signed_in" | "prototype">(configured ? "checking" : "prototype");
  const [memberName, setMemberName] = useState("");
  const [tab, setTab] = useState<Tab>("discover");
  const [feedbackOrigin, setFeedbackOrigin] = useState("Discover");
  const [draftAttendance, setDraftAttendance] = useState<EventReflectionInput["attendance"]>("attended");
  const [draftAgain, setDraftAgain] = useState<EventReflectionInput["wouldJoinAgain"]>("prefer_not_to_say");
  const [reflection, setReflection] = useState<EventReflectionInput | null>(null);
  const [product, setProduct] = useState<MobileProductData | null>(null);
  const [productState, setProductState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [productError, setProductError] = useState("");
  const [room, setRoom] = useState<MobileRoom | null>(null);
  const [roomState, setRoomState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [roomVersion, setRoomVersion] = useState(0);
  const progress = useMemo(() => calculateMovementProgress(reflection?.attendance === "attended" ? 1 : 0), [reflection]);

  const reloadProduct = useCallback(async () => {
    setProductState("loading"); setProductError("");
    try { setProduct(await loadMobileProduct()); setProductState("ready"); }
    catch (error) { setProductError(error instanceof Error ? error.message : "Live data could not be loaded."); setProductState("error"); }
  }, []);
  const refreshProductAndRoom = useCallback(async () => {
    await reloadProduct();
    setRoomVersion((version) => version + 1);
  }, [reloadProduct]);

  useEffect(() => {
    if (!configured) return;
    restoreMobileMember()
      .then((member) => { if (member) { setMemberName(member.firstName); setAuthState("signed_in"); } else setAuthState("signed_out"); })
      .catch(() => setAuthState("signed_out"));
  }, [configured]);

  useEffect(() => {
    if (authState === "signed_in") void reloadProduct();
    else { setProduct(null); setProductState("idle"); setRoom(null); setRoomState("idle"); }
  }, [authState, reloadProduct]);

  useEffect(() => {
    if (!product?.events.length) { setSelectedEventId(""); return; }
    if (!product.events.some((event) => event.id === selectedEventId)) setSelectedEventId(product.events[0].id);
  }, [product?.events, selectedEventId]);

  useEffect(() => {
    const eventId = selectedEventId;
    if (authState !== "signed_in" || tab !== "event" || !eventId) { setRoom(null); setRoomState("idle"); return; }
    let active = true;
    setRoom(null); setRoomState("loading");
    loadMobileRoom(eventId).then((nextRoom) => { if (active) {
      setRoom(nextRoom);
      setDraftAttendance(nextRoom.reflection?.attendance ?? "attended");
      setDraftAgain(nextRoom.reflection?.wouldJoinAgain ?? "prefer_not_to_say");
      setRoomState("ready");
    } })
      .catch(() => { if (active) setRoomState("error"); });
    return () => { active = false; setRoom(null); };
  }, [authState, roomVersion, selectedEventId, tab]);

  if (authState === "checking") return <SafeAreaView style={styles.safeArea}><View style={styles.loading}><ActivityIndicator color="#17241d" /><Text style={styles.loadingText}>Restoring secure session...</Text></View></SafeAreaView>;
  if (authState === "signed_out") return <LoginGate onSignedIn={(firstName) => { setMemberName(firstName); setAuthState("signed_in"); }} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <ScrollView contentContainerStyle={styles.screen}>
          <View style={[styles.prototypeBanner, authState === "signed_in" && styles.liveBanner]}><Text style={[styles.prototypeText, authState === "signed_in" && styles.liveBannerText]}>{authState === "signed_in" ? "LIVE PRIVATE BETA DATA" : "INTERACTION PROTOTYPE · NOT SYNCED"}</Text></View>
          {authState === "signed_in" ? <View style={styles.sessionRow}><Text style={styles.sessionText}>Signed in as {memberName}</Text><View style={styles.sessionActions}><DeviceManager /><Pressable accessibilityRole="button" onPress={() => logoutMobile().finally(() => { setMemberName(""); setAuthState("signed_out"); })}><Text style={styles.sessionAction}>Sign out</Text></Pressable></View></View> : null}
          <View style={styles.header}>
            <View><Text style={styles.overline}>SPORT DATE</Text><Text style={styles.title}>{tab === "discover" ? "Move. Meet. Repeat." : tab === "event" ? "After the movement." : tab === "arc" ? "Your Movement Arc." : "Help us find the rough edges."}</Text></View>
            <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
          </View>

          {authState === "signed_in" && tab !== "feedback" && (productState === "loading" || productState === "idle") ? <StateCard title="Loading your movement" body="Fetching approximate discovery, your event access, and private progress." loading /> : null}
          {authState === "signed_in" && tab !== "feedback" && productState === "error" ? <StateCard title="The connection lost its rhythm" body={productError} action="Try again" onAction={() => void reloadProduct()} /> : null}
          {(authState !== "signed_in" || productState === "ready") && tab === "discover" ? <DiscoverScreen
            live={authState === "signed_in"}
            items={authState === "signed_in" ? (product?.discovery ?? []).map((event) => ({
              id: event.id, icon: "↗", sport: event.sport, title: event.title,
              place: `${event.areaLabel}, ${event.city} · approximate`, time: new Date(event.startsAt).toLocaleString(), color: "#dff59e",
              footnote: `${event.placesRemaining} places · hosted by ${event.hostFirstName}`, request: event.request,
              subjectUserId: event.hostUserId, subjectName: event.hostFirstName,
            })) : events.map((event) => ({ ...event, id: event.sport, title: event.sport, footnote: "Demo event", request: null, subjectUserId: null, subjectName: null }))}
            onOpenEvent={() => setTab("event")}
            onRequestAction={async (event) => {
              try {
                if (event.request && (event.request.status === "pending" || event.request.status === "accepted")) await cancelMobileEventRequest(event.id, event.request.id);
                else await requestMobileEvent(event.id);
              } finally { await reloadProduct(); }
            }}
            onSafetyComplete={reloadProduct}
          /> : null}
          {(authState !== "signed_in" || productState === "ready") && tab === "event" ? authState === "signed_in"
            ? product?.events.length ? <><EventSelector events={product.events} selectedId={selectedEventId} onSelect={setSelectedEventId} />{roomState === "loading" || roomState === "idle"
              ? <StateCard title="Opening your event room" body="Exact logistics are fetched only for this authorized view." loading />
              : roomState === "error" || !room ? <StateCard title="Room access unavailable" body="Your session may be stale or event access may have changed." action="Back to discovery" onAction={() => setTab("discover")} />
              : <EventDayScreen
                live eventId={room.id} eventTitle={room.title} eventMeta={`${room.sport} · ${room.isHost ? "hosting" : "accepted participant"}`}
                venue={`${room.venueName} · ${room.address}`} hasEnded={room.hasEnded}
                room={room}
                attendance={draftAttendance}
                wouldJoinAgain={draftAgain}
                saved={room.reflection !== null} onAttendance={setDraftAttendance} onAgain={setDraftAgain}
                onSave={async () => { await saveMobileReflection(room.id, { attendance: draftAttendance, wouldJoinAgain: draftAgain }); await reloadProduct(); setTab("arc"); }}
                onSafetyComplete={refreshProductAndRoom}
                safetyPeople={[...(!room.isHost ? [room.host] : []), ...room.participants.filter((participant) => participant.userId !== room.viewerUserId).map((participant) => ({ userId: participant.userId, firstName: participant.firstName }))]}
                hostRequests={room.hostRequests}
                onHostDecision={async (requestId, action) => { try { await decideMobileHostRequest(room.id, requestId, action); } finally { await refreshProductAndRoom(); } }}
              />}</>
            : <StateCard title="No event-day room yet" body="Accepted and hosted events will appear here without exposing an address in discovery." action="Discover events" onAction={() => setTab("discover")} />
            : <EventDayScreen live={false} eventId="" eventTitle="An easy evening rally" eventMeta="Tennis · Tineretului · four places" venue={null} hasEnded attendance={draftAttendance} wouldJoinAgain={draftAgain} saved={reflection !== null} onAttendance={setDraftAttendance} onAgain={setDraftAgain} onSave={() => { setReflection({ attendance: draftAttendance, wouldJoinAgain: draftAgain }); setTab("arc"); }} onSafetyComplete={async () => undefined} safetyPeople={[]} hostRequests={[]} onHostDecision={async () => undefined} /> : null}
          {(authState !== "signed_in" || productState === "ready") && tab === "arc" ? <ArcScreen progress={authState === "signed_in" && product ? product.progress : progress} hasReflection={authState === "signed_in" ? (product?.progress.attendedMoves ?? 0) > 0 : reflection !== null} live={authState === "signed_in"} onFindMove={() => setTab("discover")} /> : null}
          {authState === "signed_in" && tab === "feedback" ? <FeedbackScreen initialScreen={feedbackOrigin} /> : null}
        </ScrollView>

        <View style={styles.tabBar} accessibilityRole="tablist">
          <TabButton label="Discover" active={tab === "discover"} onPress={() => setTab("discover")} />
          <TabButton label="Event day" active={tab === "event"} onPress={() => setTab("event")} />
          <TabButton label="My arc" active={tab === "arc"} onPress={() => setTab("arc")} />
          {authState === "signed_in" ? <TabButton label="Feedback" active={tab === "feedback"} onPress={() => { if (tab !== "feedback") setFeedbackOrigin(tab === "event" ? "Event day" : tab === "arc" ? "My arc" : "Discover"); setTab("feedback"); }} /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function LoginGate({ onSignedIn }: { onSignedIn: (firstName: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  async function signIn() {
    setSubmitting(true);
    setMessage("");
    try {
      const result = await loginMobile(email, password);
      onSignedIn(result.member.firstName);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }
  return <SafeAreaView style={styles.safeArea}><StatusBar style="dark" /><View style={styles.loginScreen}>
    <View style={styles.prototypeBanner}><Text style={styles.prototypeText}>SECURE MOBILE SESSION</Text></View>
    <Text style={styles.loginOverline}>SPORT DATE</Text><Text style={styles.loginTitle}>Bring your next move with you.</Text><Text style={styles.loginBody}>Sign in creates a revocable device session. Events remain clearly marked as demo content until live mobile event APIs are connected.</Text>
    <TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#8b958e" style={styles.loginInput} />
    <TextInput accessibilityLabel="Password" autoCapitalize="none" autoComplete="current-password" secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#8b958e" style={styles.loginInput} />
    <Pressable accessibilityRole="button" disabled={submitting || !email || !password} onPress={signIn} style={({ pressed }) => [styles.loginButton, (pressed || submitting) && styles.pressed]}><Text style={styles.loginButtonText}>{submitting ? "Signing in..." : "Sign in securely"}</Text></Pressable>
    {message ? <Text accessibilityLiveRegion="polite" style={styles.loginError}>{message}</Text> : null}
  </View></SafeAreaView>;
}

type DisplayEvent = { id: string; icon: string; sport: string; title: string; place: string; time: string; color: string; footnote: string; request: { id: string; status: "pending" | "accepted" | "declined" | "cancelled" } | null; subjectUserId: string | null; subjectName: string | null };

function DiscoverScreen({ items, live, onOpenEvent, onRequestAction, onSafetyComplete }: { items: DisplayEvent[]; live: boolean; onOpenEvent: () => void; onRequestAction: (event: DisplayEvent) => Promise<void>; onSafetyComplete: () => Promise<void> }) {
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  async function mutate(event: DisplayEvent) {
    const accepted = event.request?.status === "accepted";
    const run = async () => {
      setBusyId(event.id); setMessage("");
      try { await onRequestAction(event); setMessage(event.request ? "Request cancelled. Event access has been refreshed." : "Request sent. The host can now accept or skip it."); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Request state changed. Live events were refreshed."); }
      finally { setBusyId(""); }
    };
    if (accepted) Alert.alert("Cancel your accepted place?", "You will immediately lose the event room and exact meeting details.", [{ text: "Keep my place", style: "cancel" }, { text: "Cancel place", style: "destructive", onPress: () => void run() }]);
    else await run();
  }
  return <>
    <View style={styles.filterRow}><View style={styles.activeFilter}><Text style={styles.activeFilterText}>Nearby</Text></View><View style={styles.filter}><Text style={styles.filterText}>Today</Text></View><View style={styles.filter}><Text style={styles.filterText}>My level</Text></View></View>
    <Text style={styles.sectionTitle}>Made for your pace</Text>
    {items.length === 0 ? <StateCard title="No compatible events this week" body="Try a wider time window on web while mobile filters are being connected." /> : items.map((event, index) => <View accessibilityLabel={`${event.sport}: ${event.title}`} key={event.id} style={styles.card}>
      <View style={[styles.eventIcon, { backgroundColor: event.color }]}><Text style={styles.eventIconText}>{event.icon}</Text></View>
      <View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventPlace}>{event.sport} · {event.place}</Text><Text style={styles.eventTime}>{event.time}</Text><Text style={styles.eventFootnote}>{event.footnote}</Text>{live ? event.request?.status === "declined" || event.request?.status === "cancelled" ? <Text style={styles.requestClosed}>Request {event.request.status}</Text> : <Pressable accessibilityRole="button" disabled={busyId === event.id} onPress={() => void mutate(event)} style={[styles.requestButton, event.request && styles.requestButtonSecondary]}><Text style={styles.requestButtonText}>{busyId === event.id ? "Refreshing..." : event.request?.status === "accepted" ? "Cancel accepted place" : event.request?.status === "pending" ? "Cancel pending request" : "Request a place"}</Text></Pressable> : index === 0 ? <Pressable accessibilityRole="button" onPress={onOpenEvent} style={styles.requestButton}><Text style={styles.requestButtonText}>Open demo event</Text></Pressable> : null}{live && event.subjectUserId && event.subjectName ? <SafetyControls eventId={event.id} subjectUserId={event.subjectUserId} subjectName={event.subjectName} onComplete={onSafetyComplete} /> : null}</View>
    </View>)}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.liveMessage}>{message}</Text> : null}
    {live ? <Text style={styles.liveLimit}>Requests use the same capacity, compatibility, and mutual-block rules as web. Host decisions and reporting arrive in the next native safety slice.</Text> : <Pressable accessibilityRole="button" style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}><Text style={styles.createButtonText}>＋ Create an event</Text></Pressable>}
  </>;
}

function EventDayScreen({ live, eventId, eventTitle, eventMeta, venue, hasEnded, room = null, attendance, wouldJoinAgain, saved, onAttendance, onAgain, onSave, safetyPeople, onSafetyComplete, hostRequests, onHostDecision }: {
  live: boolean; eventId: string; eventTitle: string; eventMeta: string; venue: string | null; hasEnded: boolean; room?: MobileRoom | null;
  safetyPeople: Array<{ userId: string; firstName: string }>; onSafetyComplete: () => Promise<void>;
  hostRequests: MobileHostRequest[]; onHostDecision: (requestId: string, action: "accept" | "skip") => Promise<void>;
  attendance: EventReflectionInput["attendance"];
  wouldJoinAgain: EventReflectionInput["wouldJoinAgain"];
  saved: boolean;
  onAttendance: (value: EventReflectionInput["attendance"]) => void;
  onAgain: (value: EventReflectionInput["wouldJoinAgain"]) => void;
  onSave: () => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setSaving(true); setMessage("");
    try { await onSave(); if (live) setMessage("Private reflection saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Reflection could not be saved."); }
    finally { setSaving(false); }
  }
  return <>
    <View style={styles.eventHero}><Text style={styles.eventHeroOverline}>{live ? "AUTHORIZED EVENT ROOM" : "DEMO EVENT · ENDED"}</Text><Text style={styles.eventHeroTitle}>{eventTitle}</Text><Text style={styles.eventHeroMeta}>{eventMeta}</Text>{venue ? <Text style={styles.eventVenue}>{venue}</Text> : null}</View>
    {live && room?.updates.length ? <RoomUpdatesCard room={room} /> : null}
    {live && room?.isHost && room.latestCriticalUpdateId ? <HostRecoveryCard room={room} hostRequests={hostRequests} /> : null}
    {live && room && !room.isHost && room.latestCriticalUpdateId ? <ParticipantRecoveryIntentCard room={room} /> : null}
    {live && room?.isHost && hostRequests.length > 0 ? <HostRequestList eventId={eventId} requests={hostRequests} onDecision={onHostDecision} onSafetyComplete={onSafetyComplete} /> : null}
    {live && safetyPeople.length > 0 ? <View style={styles.peopleSafety}><Text style={styles.choiceLabel}>PEOPLE AND SAFETY</Text>{safetyPeople.map((person) => <View key={person.userId} style={styles.personRow}><Text style={styles.personName}>{person.firstName}</Text><SafetyControls eventId={eventId} subjectUserId={person.userId} subjectName={person.firstName} onComplete={onSafetyComplete} /></View>)}</View> : null}
    {!hasEnded ? <StateCard title="The reflection opens after movement" body="Check the authorized logistics above. You can leave at any time and reporting remains separate from progress." /> : <View style={styles.reflectionCard}>
      <Text style={styles.reflectionNumber}>01</Text><Text style={styles.reflectionTitle}>What actually happened?</Text><Text style={styles.reflectionBody}>Private reflection only. This is not a public rating and it does not replace a safety report.</Text>
      <Text style={styles.choiceLabel}>MY ATTENDANCE</Text><ChoiceRow choices={attendanceChoices} selected={attendance} onSelect={onAttendance} />
      <Text style={styles.choiceLabel}>WOULD I JOIN THIS GROUP AGAIN?</Text><ChoiceRow choices={againChoices} selected={wouldJoinAgain} onSelect={onAgain} />
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.pressed]}><Text style={styles.saveButtonText}>{saving ? "Saving..." : saved ? live ? "Update private reflection" : "Update local reflection" : "Save and see my arc"}</Text></Pressable>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.inlineMessage}>{message}</Text> : null}
      <Text style={styles.safetyNote}>Leaving early or not attending creates no penalty. If something felt unsafe, use reporting—not this reflection.</Text>
    </View>}
  </>;
}

function ChoiceRow<T extends string>({ choices, selected, onSelect }: { choices: Array<{ value: T; label: string }>; selected: T; onSelect: (value: T) => void }) {
  return <View style={styles.choiceRow}>{choices.map((choice) => <Pressable key={choice.value} accessibilityRole="radio" accessibilityState={{ checked: selected === choice.value }} onPress={() => onSelect(choice.value)} style={[styles.choice, selected === choice.value && styles.choiceSelected]}><Text style={[styles.choiceText, selected === choice.value && styles.choiceTextSelected]}>{choice.label}</Text></Pressable>)}</View>;
}

function RoomUpdatesCard({ room }: { room: MobileRoom }) {
  const [seenState, setSeenState] = useState<"idle" | "sending" | "done" | "error">(room.viewerHasSeenLatestUpdate ? "done" : "idle");

  useEffect(() => {
    setSeenState(room.viewerHasSeenLatestUpdate ? "done" : "idle");
  }, [room.latestUpdateId, room.viewerHasSeenLatestUpdate]);

  useEffect(() => {
    if (room.isHost || !room.latestUpdateId || room.viewerHasSeenLatestUpdate || seenState === "sending" || seenState === "done") return;
    let active = true;
    setSeenState("sending");
    markMobileEventUpdateSeen(room.id, room.latestUpdateId)
      .then(() => { if (active) setSeenState("done"); })
      .catch(() => { if (active) setSeenState("error"); });
    return () => { active = false; };
  }, [room.id, room.isHost, room.latestUpdateId, room.viewerHasSeenLatestUpdate, seenState]);

  const latest = room.updates[0];
  return <View style={styles.roomUpdatesCard}><Text style={styles.choiceLabel}>HOST UPDATES</Text><Text style={styles.roomUpdatesTitle}>{latest?.severity === "critical" ? "Critical host change" : latest?.summary}</Text><Text style={styles.roomUpdatesBody}>The room always shows the latest authoritative version of the plan. Use this timeline to see what changed before you travel.</Text>{room.updates.map((update) => <View key={update.id} style={styles.roomUpdateItem}><Text style={styles.roomUpdateTime}>{new Date(update.createdAt).toLocaleString()}</Text><Text style={styles.roomUpdateSummary}>{update.summary}</Text><Text style={styles.roomUpdateMeta}>{update.severity === "critical" ? "critical change" : "routine change"} · {update.changedFields.map((field) => MOBILE_EVENT_UPDATE_FIELD_LABELS[field] ?? field).join(" · ")}</Text></View>)}{room.isHost ? <Text style={styles.roomUpdatesFootnote}>{room.participants.filter((participant) => participant.seenLatestUpdate).length} of {room.participants.length} accepted {room.participants.length === 1 ? "member has" : "members have"} opened the newest update.</Text> : seenState === "sending" ? <Text style={styles.roomUpdatesFootnote}>Marking the newest host update as seen…</Text> : seenState === "done" ? <Text style={styles.roomUpdatesFootnote}>You opened the newest host update.</Text> : seenState === "error" ? <Text style={styles.roomUpdatesFootnote}>This room still has the latest plan, even if the seen receipt could not be refreshed.</Text> : <Text style={styles.roomUpdatesFootnote}>Opening this room marks the newest host update as seen.</Text>}</View>;
}

function ParticipantRecoveryIntentCard({ room }: { room: MobileRoom }) {
  const [intent, setIntent] = useState<"still_in" | "unsure" | "cannot_make" | null>(room.viewerCriticalUpdateIntent);
  const [submitting, setSubmitting] = useState<"" | "still_in" | "unsure" | "cannot_make">("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIntent(room.viewerCriticalUpdateIntent);
    setMessage("");
  }, [room.latestCriticalUpdateId, room.viewerCriticalUpdateIntent]);

  async function respond(nextIntent: "still_in" | "unsure" | "cannot_make") {
    if (!room.latestCriticalUpdateId) return;
    setSubmitting(nextIntent); setMessage("");
    try {
      await saveMobileEventUpdateIntent(room.id, room.latestCriticalUpdateId, nextIntent);
      setIntent(nextIntent);
      setMessage("Your host can now see your latest response to this critical change.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your response could not be saved.");
    } finally {
      setSubmitting("");
    }
  }

  return <View style={styles.roomIntentCard}><Text style={styles.roomIntentTitle}>Can you still make it after this critical change?</Text><Text style={styles.roomIntentBody}>Answering here helps the host decide whether the plan still honestly exists, needs reshaping, or should be cancelled early.</Text><View style={styles.roomIntentActions}>{[{ value: "still_in", label: "Still in" }, { value: "unsure", label: "Unsure" }, { value: "cannot_make", label: "Cannot make it" }].map((option) => <Pressable key={option.value} accessibilityRole="button" disabled={submitting !== ""} onPress={() => void respond(option.value as "still_in" | "unsure" | "cannot_make")} style={[styles.roomIntentButton, intent === option.value && styles.roomIntentButtonSelected]}><Text style={[styles.roomIntentButtonText, intent === option.value && styles.roomIntentButtonTextSelected]}>{submitting === option.value ? "Saving..." : option.label}</Text></Pressable>)}</View>{message ? <Text accessibilityLiveRegion="polite" style={styles.roomIntentMessage}>{message}</Text> : null}</View>;
}

function HostRecoveryCard({ room, hostRequests }: { room: MobileRoom; hostRequests: MobileHostRequest[] }) {
  const pendingCount = hostRequests.filter((request) => request.status === "pending").length;
  const guidance = getHostRecoveryGuidance(room.criticalUpdateResponseCounts, pendingCount);

  return <View style={styles.hostRecoveryCard}><Text style={styles.choiceLabel}>RECOVERY AFTER A CRITICAL CHANGE</Text><Text style={styles.hostRecoveryTitle}>{guidance.title}</Text><Text style={styles.hostRecoveryBody}>{guidance.body}</Text><View style={styles.hostRecoveryCounts}><View style={styles.hostRecoveryCount}><Text style={styles.hostRecoveryCountText}>{room.criticalUpdateResponseCounts.stillIn} still in</Text></View><View style={styles.hostRecoveryCount}><Text style={styles.hostRecoveryCountText}>{room.criticalUpdateResponseCounts.unsure} unsure</Text></View><View style={styles.hostRecoveryCount}><Text style={styles.hostRecoveryCountText}>{room.criticalUpdateResponseCounts.cannotMake} cannot make it</Text></View></View>{guidance.replacement ? <Text style={styles.hostRecoveryBody}>{guidance.replacement}</Text> : null}<Text style={styles.hostRecoveryNote}>Use the room to watch responses, review pending requests before widening the invitation again, and cancel early if the plan no longer honestly exists.</Text></View>;
}

function HostRequestList({ eventId, requests, onDecision, onSafetyComplete }: { eventId: string; requests: MobileHostRequest[]; onDecision: (requestId: string, action: "accept" | "skip") => Promise<void>; onSafetyComplete: () => Promise<void> }) {
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  async function decide(requestId: string, action: "accept" | "skip") {
    setBusyId(requestId); setMessage("");
    try { await onDecision(requestId, action); setMessage(action === "accept" ? "Place accepted and room access granted." : "Request skipped. The third skip becomes a private decline."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request state changed and was refreshed."); }
    finally { setBusyId(""); }
  }
  const summary = summarizeHostRequestQueue(requests);
  const pending = requests.filter((request) => request.status === "pending");
  const accepted = requests.filter((request) => request.status === "accepted");
  const closed = requests.filter((request) => request.status === "declined" || request.status === "cancelled");
  return <View style={styles.hostRequests}><Text style={styles.choiceLabel}>HOST REQUEST QUEUE</Text><View style={styles.hostRequestSummary}><View style={styles.hostRequestSummaryPill}><Text style={styles.hostRequestSummaryText}>{summary.pendingCount} pending</Text></View><View style={styles.hostRequestSummaryPill}><Text style={styles.hostRequestSummaryText}>{summary.acceptedCount} accepted</Text></View><View style={styles.hostRequestSummaryPill}><Text style={styles.hostRequestSummaryText}>{summary.closedCount} closed</Text></View></View><View style={styles.hostRequestSection}><Text style={styles.hostRequestSectionTitle}>{summary.pendingHeadline}</Text>{summary.pendingBody ? <Text style={styles.hostRequestSectionBody}>{summary.pendingBody}</Text> : null}{pending.length === 0 ? <Text style={styles.hostRequestSectionBody}>There is nothing waiting for a host decision right now.</Text> : null}{pending.map((request) => <View key={request.id} style={styles.hostRequestCard}>
    <View><Text style={styles.hostRequestName}>{request.requester.firstName}, {request.requester.age}</Text><Text style={styles.hostRequestMeta}>{request.requester.skillLevel} · {request.requester.languages.join(", ")}</Text></View>
    {request.requester.bio ? <Text style={styles.hostRequestBody}>{request.requester.bio}</Text> : null}{request.introduction ? <Text style={styles.hostRequestIntro}>{request.introduction}</Text> : null}<Text style={styles.hostRequestStatus}>{request.status}</Text>
    <View style={styles.hostRequestActions}><Pressable accessibilityRole="button" disabled={busyId === request.id} onPress={() => void decide(request.id, "skip")} style={styles.skipButton}><Text style={styles.skipButtonText}>{request.skipCount >= 2 ? "Skip & decline" : `Skip ${request.skipCount + 1}/3`}</Text></Pressable><Pressable accessibilityRole="button" disabled={busyId === request.id} onPress={() => void decide(request.id, "accept")} style={styles.acceptButton}><Text style={styles.acceptButtonText}>{busyId === request.id ? "Refreshing..." : "Accept place"}</Text></Pressable></View>
    <SafetyControls eventId={eventId} subjectUserId={request.requesterId} subjectName={request.requester.firstName} onComplete={onSafetyComplete} />
  </View>)}</View>{accepted.length > 0 ? <View style={styles.hostRequestSection}><Text style={styles.hostRequestSectionTitle}>Already in the group</Text><Text style={styles.hostRequestSectionBody}>These people already have room access and precise meeting details.</Text>{accepted.map((request) => <View key={request.id} style={styles.hostRequestCard}><View><Text style={styles.hostRequestName}>{request.requester.firstName}, {request.requester.age}</Text><Text style={styles.hostRequestMeta}>{request.requester.skillLevel} · {request.requester.languages.join(", ")}</Text></View>{request.requester.bio ? <Text style={styles.hostRequestBody}>{request.requester.bio}</Text> : null}{request.introduction ? <Text style={styles.hostRequestIntro}>{request.introduction}</Text> : null}<Text style={styles.hostRequestStatus}>{request.status}</Text><SafetyControls eventId={eventId} subjectUserId={request.requesterId} subjectName={request.requester.firstName} onComplete={onSafetyComplete} /></View>)}</View> : null}{closed.length > 0 ? <View style={styles.hostRequestSection}><Text style={styles.hostRequestSectionTitle}>Already resolved</Text><Text style={styles.hostRequestSectionBody}>Closed requests stay visible for context, but they no longer need host action.</Text>{closed.map((request) => <View key={request.id} style={styles.hostRequestCard}><View><Text style={styles.hostRequestName}>{request.requester.firstName}, {request.requester.age}</Text><Text style={styles.hostRequestMeta}>{request.requester.skillLevel} · {request.requester.languages.join(", ")}</Text></View>{request.requester.bio ? <Text style={styles.hostRequestBody}>{request.requester.bio}</Text> : null}{request.introduction ? <Text style={styles.hostRequestIntro}>{request.introduction}</Text> : null}<Text style={styles.hostRequestStatus}>{request.status}</Text><SafetyControls eventId={eventId} subjectUserId={request.requesterId} subjectName={request.requester.firstName} onComplete={onSafetyComplete} /></View>)}</View> : null}{message ? <Text accessibilityLiveRegion="polite" style={styles.liveMessage}>{message}</Text> : null}</View>;
}

function EventSelector({ events, selectedId, onSelect }: { events: MobileMemberEvent[]; selectedId: string; onSelect: (eventId: string) => void }) {
  return <View style={styles.eventSelector}><Text style={styles.choiceLabel}>MY AUTHORIZED EVENTS</Text><View style={styles.choiceRow}>{events.map((event) => <Pressable key={event.id} accessibilityRole="radio" accessibilityState={{ checked: selectedId === event.id }} onPress={() => onSelect(event.id)} style={[styles.eventChoice, selectedId === event.id && styles.eventChoiceSelected]}><Text style={[styles.eventChoiceTitle, selectedId === event.id && styles.choiceTextSelected]} numberOfLines={1}>{event.title}</Text><Text style={[styles.eventChoiceMeta, selectedId === event.id && styles.eventChoiceMetaSelected]}>{event.hasEnded ? "Ended" : "Upcoming"} · {event.isHost ? "Host" : "Joined"}</Text></Pressable>)}</View></View>;
}

function ArcScreen({ progress, hasReflection, live, onFindMove }: { progress: ReturnType<typeof calculateMovementProgress>; hasReflection: boolean; live: boolean; onFindMove: () => void }) {
  return <View style={styles.arcCard}>
    <View style={styles.arcOrbit}><View style={styles.arcOrbitInner}><Text style={styles.arcCount}>{progress.attendedMoves}</Text><Text style={styles.arcCountLabel}>MOVES</Text></View></View>
    <Text style={styles.arcOverline}>CURRENT STAGE</Text><Text style={styles.arcTitle}>{progress.currentStage.label}</Text>
    <View style={styles.arcTrack}><View style={[styles.arcTrackFill, { width: `${progress.stageProgressPercent}%` }]} /></View>
    <Text style={styles.arcStory}>{progress.nextStage ? `${progress.movesToNextStage} more ${progress.movesToNextStage === 1 ? "move" : "moves"} to reach ${progress.nextStage.label}.` : "Keep choosing movement that feels worthwhile. There is no leaderboard to chase."}</Text>
    <View style={styles.arcRule}><Text style={styles.arcRuleTitle}>{hasReflection ? live ? "Based on your private live reflections" : "Based on this local demo reflection" : "Nothing manufactured"}</Text><Text style={styles.arcRuleBody}>Only self-confirmed attendance after a qualified event advances the arc. No points for swipes, skips, rejection, or daily login.</Text></View>
    <Pressable accessibilityRole="button" onPress={onFindMove} style={({ pressed }) => [styles.arcButton, pressed && styles.pressed]}><Text style={styles.arcButtonText}>Find another move</Text></Pressable>
  </View>;
}

function StateCard({ title, body, loading = false, action, onAction }: { title: string; body: string; loading?: boolean; action?: string; onAction?: () => void }) {
  return <View style={styles.stateCard}>{loading ? <ActivityIndicator color="#17241d" /> : null}<Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateBody}>{body}</Text>{action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.stateAction}><Text style={styles.stateActionText}>{action}</Text></Pressable> : null}</View>;
}

function SafetyControls({ eventId, subjectUserId, subjectName, onComplete }: { eventId: string; subjectUserId: string; subjectName: string; onComplete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<SafetyReportCategory>("harassment");
  const [details, setDetails] = useState("");
  const [blockWithReport, setBlockWithReport] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  async function blockNow() {
    setSubmitting(true); setMessage("");
    try { await blockMobileMember(subjectUserId); setOpen(false); await onComplete(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Member could not be blocked."); }
    finally { setSubmitting(false); }
  }
  async function report() {
    setSubmitting(true); setMessage("");
    try {
      const result = await reportMobileSafety({ reportedUserId: subjectUserId, eventId, category, details, blockUser: blockWithReport });
      setMessage(result.message); setDetails("");
      if (blockWithReport) { setOpen(false); await onComplete(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Report could not be submitted."); }
    finally { setSubmitting(false); }
  }
  return <>
    <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.safetyButton}><Text style={styles.safetyButtonText}>Safety</Text></Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.modalBackdrop}><View style={styles.safetyModal}>
        <ScrollView contentContainerStyle={styles.safetyModalContent}>
          <View style={styles.safetyModalHeader}><View><Text style={styles.safetyModalOverline}>PRIVATE SAFETY ACTION</Text><Text style={styles.safetyModalTitle}>{subjectName}</Text></View><Pressable accessibilityRole="button" onPress={() => setOpen(false)}><Text style={styles.modalClose}>Close</Text></Pressable></View>
          <Text style={styles.safetyModalBody}>Blocking immediately removes shared requests, accepted places, room access, and exact location access. It does not tell the other member who blocked them.</Text>
          <Pressable accessibilityRole="button" disabled={submitting} onPress={() => Alert.alert(`Block ${subjectName}?`, "Shared event access is removed immediately and is not restored by unblocking.", [{ text: "Cancel", style: "cancel" }, { text: "Block", style: "destructive", onPress: () => void blockNow() }])} style={styles.blockButton}><Text style={styles.blockButtonText}>Block now</Text></Pressable>
          <Text style={styles.choiceLabel}>REPORT CATEGORY</Text><View style={styles.choiceRow}>{SAFETY_REPORT_CATEGORIES.map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: category === value }} onPress={() => setCategory(value)} style={[styles.choice, category === value && styles.choiceSelected]}><Text style={[styles.choiceText, category === value && styles.choiceTextSelected]}>{value.replaceAll("_", " ")}</Text></Pressable>)}</View>
          <Text style={styles.choiceLabel}>WHAT HAPPENED?</Text><TextInput accessibilityLabel="Safety report details" multiline numberOfLines={5} maxLength={2000} value={details} onChangeText={setDetails} placeholder="Describe observable facts, timing, and what made you feel unsafe." placeholderTextColor="#8b958e" style={styles.reportInput} />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: blockWithReport }} onPress={() => setBlockWithReport((value) => !value)} style={styles.checkRow}><View style={[styles.checkbox, blockWithReport && styles.checkboxChecked]} /><Text style={styles.checkText}>Also block this member and revoke shared access now</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={submitting || details.trim().length < 20} onPress={() => void report()} style={[styles.reportButton, (submitting || details.trim().length < 20) && styles.disabled]}><Text style={styles.reportButtonText}>{submitting ? "Recording..." : "Submit private report"}</Text></Pressable>
          <Text style={styles.emergencyText}>Sport Date is not an emergency responder. If anyone is in immediate danger, contact local emergency services.</Text>
          {message ? <Text accessibilityLiveRegion="polite" style={styles.safetyResult}>{message}</Text> : null}
        </ScrollView>
      </View></View>
    </Modal>
  </>;
}

const feedbackCategoryLabels: Record<FeedbackCategory, string> = {
  bug: "Something broke",
  missing_feature: "Something is missing",
  usability: "Hard to use",
  accessibility: "Accessibility",
  performance: "Slow or unreliable",
  content: "Words or information",
  suggestion: "An idea",
  other: "Something else",
};
const feedbackSeverityLabels: Record<FeedbackSeverity, string> = {
  low: "Small friction",
  medium: "Slowed me down",
  high: "Blocked my task",
  blocker: "Could not continue",
};
const feedbackStatusLabels: Record<MobileFeedbackTicket["status"], string> = {
  open: "Shared",
  in_progress: "Being reviewed",
  resolved: "Addressed",
  closed: "Closed",
};

function FeedbackScreen({ initialScreen }: { initialScreen: string }) {
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [severity, setSeverity] = useState<FeedbackSeverity>("low");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [currentPath, setCurrentPath] = useState(initialScreen);
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [actualOutcome, setActualOutcome] = useState("");
  const [tickets, setTickets] = useState<MobileFeedbackTicket[]>([]);
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "error">("loading");
  const [historyError, setHistoryError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const load = useCallback(async () => {
    setHistoryState("loading"); setHistoryError("");
    try { setTickets(await loadMobileFeedback()); setHistoryState("ready"); }
    catch (error) { setHistoryError(error instanceof Error ? error.message : "Your feedback could not be loaded."); setHistoryState("error"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const canSubmit = summary.trim().length >= 10 && details.trim().length >= 20 && currentPath.trim().length > 0;
  async function submit() {
    setSubmitting(true); setSubmitMessage("");
    const feedback: FeedbackTicketInput = {
      category, surface: "mobile", summary, details, currentPath,
      expectedOutcome: expectedOutcome.trim() || null,
      actualOutcome: actualOutcome.trim() || null,
      severity,
    };
    try {
      const ticket = await submitMobileFeedback(feedback);
      setTickets((current) => [ticket, ...current.filter((item) => item.id !== ticket.id)]);
      setSummary(""); setDetails(""); setExpectedOutcome(""); setActualOutcome(""); setSeverity("low");
      setSubmitMessage("Thank you. Your product feedback is now with the team.");
      setHistoryState("ready");
    } catch (error) { setSubmitMessage(error instanceof Error ? error.message : "Your feedback could not be shared."); }
    finally { setSubmitting(false); }
  }

  return <>
    <View style={styles.feedbackSafetyRoute} accessibilityRole="summary">
      <Text style={styles.feedbackSafetyTitle}>This is for product feedback</Text>
      <Text style={styles.feedbackSafetyBody}>If this concerns another member or an event, use the Safety button beside that person so it reaches the private safety review path. If anyone is in immediate danger, contact local emergency services.</Text>
    </View>
    <View style={styles.feedbackPanel}>
      <Text style={styles.feedbackPanelOverline}>NEW FEEDBACK · PHONE APP</Text>
      <Text style={styles.feedbackPanelTitle}>What happened?</Text>
      <Text style={styles.feedbackIntro}>A short, specific example is perfect. You can keep this comfortably one-handed.</Text>
      <View style={styles.feedbackPrivacy}>
        <Text style={styles.feedbackPrivacyTitle}>Keep private details out.</Text>
        <Text style={styles.feedbackPrivacyBody}>Do not include exact addresses, contact or payment details, health information, private messages, passwords, tokens, coordinates, or map pins.</Text>
      </View>

      <Text style={styles.choiceLabel}>WHAT KIND OF FEEDBACK IS THIS?</Text>
      <View style={styles.choiceRow}>{FEEDBACK_CATEGORIES.map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={feedbackCategoryLabels[value]} accessibilityState={{ checked: category === value }} onPress={() => setCategory(value)} style={[styles.choice, category === value && styles.choiceSelected]}><Text style={[styles.choiceText, category === value && styles.choiceTextSelected]}>{feedbackCategoryLabels[value]}</Text></Pressable>)}</View>

      <Text style={styles.feedbackFieldLabel}>Short summary</Text>
      <TextInput accessibilityLabel="Feedback short summary" value={summary} onChangeText={setSummary} maxLength={160} placeholder="I could not cancel my request" placeholderTextColor="#8b958e" style={styles.feedbackInput} />
      <Text style={styles.feedbackHint}>10–160 characters</Text>

      <Text style={styles.feedbackFieldLabel}>What were you trying to do?</Text>
      <TextInput accessibilityLabel="Feedback experience details" multiline numberOfLines={5} value={details} onChangeText={setDetails} maxLength={4000} placeholder="Describe the steps you took without including anyone's private information." placeholderTextColor="#8b958e" style={[styles.feedbackInput, styles.feedbackTextArea]} />
      <Text style={styles.feedbackHint}>At least 20 characters</Text>

      <Text style={styles.feedbackFieldLabel}>Screen where it happened</Text>
      <TextInput accessibilityLabel="Affected app screen" value={currentPath} onChangeText={setCurrentPath} maxLength={200} placeholder="For example: Event day" placeholderTextColor="#8b958e" style={styles.feedbackInput} />

      <Text style={styles.feedbackFieldLabel}>What did you expect? (optional)</Text>
      <TextInput accessibilityLabel="Expected outcome" multiline numberOfLines={3} value={expectedOutcome} onChangeText={setExpectedOutcome} maxLength={1000} placeholder="What should the app have done?" placeholderTextColor="#8b958e" style={[styles.feedbackInput, styles.feedbackSmallArea]} />

      <Text style={styles.feedbackFieldLabel}>What happened instead? (optional)</Text>
      <TextInput accessibilityLabel="Actual outcome" multiline numberOfLines={3} value={actualOutcome} onChangeText={setActualOutcome} maxLength={1000} placeholder="What did you see or experience?" placeholderTextColor="#8b958e" style={[styles.feedbackInput, styles.feedbackSmallArea]} />

      <Text style={styles.choiceLabel}>HOW MUCH DID THIS AFFECT YOU?</Text>
      <View style={styles.choiceRow}>{FEEDBACK_SEVERITIES.map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={feedbackSeverityLabels[value]} accessibilityState={{ checked: severity === value }} onPress={() => setSeverity(value)} style={[styles.choice, severity === value && styles.choiceSelected]}><Text style={[styles.choiceText, severity === value && styles.choiceTextSelected]}>{feedbackSeverityLabels[value]}</Text></Pressable>)}</View>

      <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting || !canSubmit, busy: submitting }} disabled={submitting || !canSubmit} onPress={() => void submit()} style={[styles.saveButton, (submitting || !canSubmit) && styles.disabled]}><Text style={styles.saveButtonText}>{submitting ? "Sharing..." : "Share product feedback"}</Text></Pressable>
      {submitMessage ? <Text accessibilityLiveRegion="polite" style={styles.feedbackMessage}>{submitMessage}</Text> : null}
    </View>

    <View style={styles.feedbackHistory} accessibilityState={{ busy: historyState === "loading" }}>
      <View style={styles.feedbackHistoryHeader}><View><Text style={styles.feedbackPanelOverline}>YOUR FEEDBACK</Text><Text style={styles.feedbackHistoryTitle}>What you've shared</Text></View>{historyState === "ready" ? <Text accessibilityLabel={`${tickets.length} feedback tickets`} style={styles.feedbackCount}>{tickets.length}</Text> : null}</View>
      {historyState === "loading" ? <View style={styles.feedbackHistoryState}><ActivityIndicator color="#17241d" /><Text style={styles.feedbackHint}>Loading your feedback...</Text></View> : null}
      {historyState === "error" ? <View style={styles.feedbackHistoryState}><Text accessibilityLiveRegion="assertive" style={styles.feedbackMessage}>{historyError}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.stateAction}><Text style={styles.stateActionText}>Try again</Text></Pressable></View> : null}
      {historyState === "ready" && tickets.length === 0 ? <View style={styles.feedbackHistoryState}><Text style={styles.feedbackEmptyTitle}>Nothing shared yet.</Text><Text style={styles.feedbackHint}>Once you send feedback, its status will appear here.</Text></View> : null}
      {historyState === "ready" ? tickets.map((ticket) => <View key={ticket.id} accessibilityLabel={`${ticket.summary}, ${feedbackStatusLabels[ticket.status]}`} style={styles.feedbackTicket}>
        <View style={styles.feedbackTicketMeta}><Text style={styles.feedbackTicketCategory}>{feedbackCategoryLabels[ticket.category]}</Text><Text style={styles.feedbackTicketStatus}>{feedbackStatusLabels[ticket.status]}</Text></View>
        <Text style={styles.feedbackTicketTitle}>{ticket.summary}</Text>
        <Text style={styles.feedbackTicketDetail}>{ticket.currentPath} · {feedbackSeverityLabels[ticket.severity]} · {new Date(ticket.createdAt).toLocaleDateString()}</Text>
      </View>) : null}
    </View>
  </>;
}

function DeviceManager() {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<MobileDeviceSession[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  async function load() {
    setState("loading"); setMessage("");
    try { setDevices(await loadMobileDevices()); setState("ready"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Devices could not be loaded."); setState("error"); }
  }
  function show() { setOpen(true); void load(); }
  async function revoke(device: MobileDeviceSession) {
    try { await revokeMobileDevice(device.id); await load(); setMessage(`${device.deviceName} was revoked.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Device could not be revoked."); }
  }
  return <>
    <Pressable accessibilityRole="button" onPress={show}><Text style={styles.sessionAction}>Devices</Text></Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={styles.modalBackdrop}><View style={styles.safetyModal}><ScrollView contentContainerStyle={styles.safetyModalContent}>
      <View style={styles.safetyModalHeader}><View><Text style={styles.safetyModalOverline}>ACCOUNT SECURITY</Text><Text style={styles.safetyModalTitle}>Mobile devices</Text></View><Pressable accessibilityRole="button" onPress={() => setOpen(false)}><Text style={styles.modalClose}>Close</Text></Pressable></View>
      <Text style={styles.safetyModalBody}>Revoke devices you no longer recognize. Tokens and hashes are never shown here.</Text>
      {state === "loading" ? <ActivityIndicator color="#17241d" style={styles.deviceLoading} /> : null}
      {state === "error" ? <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.stateAction}><Text style={styles.stateActionText}>Try again</Text></Pressable> : null}
      {state === "ready" ? devices.map((device) => <View key={device.id} style={styles.deviceCard}><View><Text style={styles.deviceName}>{device.deviceName}</Text><Text style={styles.deviceMeta}>{device.current ? "This device" : device.active ? "Active" : device.revokedAt ? "Revoked" : "Expired"} · last used {new Date(device.lastUsedAt).toLocaleString()}</Text></View>{device.active && !device.current ? <Pressable accessibilityRole="button" onPress={() => Alert.alert(`Revoke ${device.deviceName}?`, "That device must sign in again.", [{ text: "Cancel", style: "cancel" }, { text: "Revoke", style: "destructive", onPress: () => void revoke(device) }])} style={styles.blockButton}><Text style={styles.blockButtonText}>Revoke device</Text></Pressable> : null}</View>) : null}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.safetyResult}>{message}</Text> : null}
    </ScrollView></View></View></Modal>
  </>;
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.tab}><View style={[styles.tabDot, active && styles.tabDotActive]} /><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f0e7" }, appShell: { flex: 1 }, screen: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 120 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, loadingText: { color: "#657168", fontSize: 12, fontWeight: "700" },
  loginScreen: { flex: 1, justifyContent: "center", paddingHorizontal: 25 }, loginOverline: { color: "#657168", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }, loginTitle: { maxWidth: 330, color: "#17241d", fontSize: 42, lineHeight: 42, fontWeight: "900", letterSpacing: -1.8, marginTop: 10 }, loginBody: { color: "#657168", fontSize: 12, lineHeight: 19, marginTop: 15, marginBottom: 26 }, loginInput: { minHeight: 52, borderWidth: 1, borderColor: "#d1d7d2", borderRadius: 15, paddingHorizontal: 15, backgroundColor: "white", color: "#17241d", marginBottom: 10 }, loginButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#17241d", marginTop: 3 }, loginButtonText: { color: "#c9f458", fontWeight: "900" }, loginError: { color: "#8f2a2a", fontSize: 11, lineHeight: 16, marginTop: 12 },
  prototypeBanner: { alignSelf: "flex-start", borderRadius: 20, backgroundColor: "#ffe0d4", paddingHorizontal: 10, paddingVertical: 6, marginBottom: 18 }, prototypeText: { color: "#713b31", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  liveBanner: { backgroundColor: "#dff59e" }, liveBannerText: { color: "#31411f" },
  sessionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: -8, marginBottom: 19 }, sessionText: { color: "#657168", fontSize: 10, fontWeight: "700" }, sessionActions: { flexDirection: "row", gap: 14 }, sessionAction: { color: "#713b31", fontSize: 10, fontWeight: "900" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }, overline: { color: "#657168", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }, title: { maxWidth: 280, color: "#17241d", fontSize: 30, fontWeight: "900", letterSpacing: -1.2, marginTop: 5 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#17241d", alignItems: "center", justifyContent: "center" }, avatarText: { color: "#c9f458", fontWeight: "900" },
  filterRow: { flexDirection: "row", gap: 9, marginBottom: 34 }, filter: { borderWidth: 1, borderColor: "#c8cdc8", borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10 }, activeFilter: { borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#17241d" }, filterText: { color: "#526057", fontSize: 12, fontWeight: "700" }, activeFilterText: { color: "white", fontSize: 12, fontWeight: "800" }, sectionTitle: { color: "#17241d", fontSize: 20, fontWeight: "900", marginBottom: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 22, padding: 14, marginBottom: 11 }, eventIcon: { width: 62, height: 72, borderRadius: 17, alignItems: "center", justifyContent: "center" }, eventIconText: { color: "#17241d", fontSize: 25, fontWeight: "900" }, eventCopy: { flex: 1, paddingHorizontal: 14 }, eventTitle: { fontSize: 17, fontWeight: "900", color: "#17241d" }, eventPlace: { color: "#707b73", fontSize: 11, marginTop: 5 }, eventTime: { color: "#314b3a", fontSize: 11, fontWeight: "800", marginTop: 6 }, eventFootnote: { color: "#879189", fontSize: 9, marginTop: 5 }, requestButton: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#c9f458", marginTop: 10 }, requestButtonSecondary: { backgroundColor: "#ffe0d4" }, requestButtonText: { color: "#17241d", fontSize: 9, fontWeight: "900" }, requestClosed: { color: "#8f5a4b", fontSize: 9, fontWeight: "900", textTransform: "capitalize", marginTop: 9 }, liveMessage: { padding: 12, borderRadius: 11, backgroundColor: "#eef5da", color: "#435039", fontSize: 10, lineHeight: 15 }, liveLimit: { color: "#657168", fontSize: 10, lineHeight: 15, marginTop: 10 }, arrow: { color: "#627067", fontSize: 28 }, createButton: { backgroundColor: "#c9f458", borderRadius: 18, alignItems: "center", paddingVertical: 17, marginTop: 16 }, createButtonText: { color: "#17241d", fontWeight: "900", fontSize: 15 }, pressed: { opacity: .72 },
  eventHero: { padding: 22, borderRadius: 24, backgroundColor: "#17241d", marginBottom: 12 }, eventHeroOverline: { color: "#c9f458", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 }, eventHeroTitle: { color: "white", fontSize: 30, lineHeight: 31, fontWeight: "900", letterSpacing: -1, marginTop: 30 }, eventHeroMeta: { color: "#b7c3bb", fontSize: 11, marginTop: 9 }, eventVenue: { color: "white", fontSize: 12, lineHeight: 18, fontWeight: "800", marginTop: 22 },
  roomUpdatesCard: { padding: 18, borderRadius: 18, backgroundColor: "white", marginBottom: 12 }, roomUpdatesTitle: { color: "#17241d", fontSize: 20, fontWeight: "900", marginTop: 6 }, roomUpdatesBody: { color: "#657168", fontSize: 11, lineHeight: 17, marginTop: 8 }, roomUpdateItem: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#edf0ed", marginTop: 12 }, roomUpdateTime: { color: "#526057", fontSize: 9, fontWeight: "900" }, roomUpdateSummary: { color: "#17241d", fontSize: 12, lineHeight: 18, marginTop: 5 }, roomUpdateMeta: { color: "#657168", fontSize: 9, lineHeight: 14, marginTop: 5 }, roomUpdatesFootnote: { color: "#657168", fontSize: 10, lineHeight: 15, marginTop: 12 },
  eventSelector: { marginBottom: 8 }, eventChoice: { maxWidth: 190, borderWidth: 1, borderColor: "#c8d0ca", borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "white" }, eventChoiceSelected: { borderColor: "#17241d", backgroundColor: "#17241d" }, eventChoiceTitle: { maxWidth: 150, color: "#17241d", fontSize: 11, fontWeight: "900" }, eventChoiceMeta: { color: "#78837b", fontSize: 8, marginTop: 4 }, eventChoiceMetaSelected: { color: "#aebbb2" },
  peopleSafety: { padding: 18, borderRadius: 18, backgroundColor: "white", marginBottom: 12 }, personRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#edf0ed", paddingVertical: 11 }, personName: { color: "#17241d", fontSize: 12, fontWeight: "900" }, safetyButton: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#e1b9ae", borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, marginTop: 8 }, safetyButtonText: { color: "#713b31", fontSize: 8, fontWeight: "900" },
  roomIntentCard: { padding: 18, borderRadius: 18, backgroundColor: "#17241d", marginBottom: 12 }, roomIntentTitle: { color: "white", fontSize: 18, fontWeight: "900" }, roomIntentBody: { color: "#bdc8c1", fontSize: 11, lineHeight: 17, marginTop: 8 }, roomIntentActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, roomIntentButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#314338" }, roomIntentButtonSelected: { backgroundColor: "#c9f458" }, roomIntentButtonText: { color: "white", fontSize: 10, fontWeight: "900" }, roomIntentButtonTextSelected: { color: "#17241d" }, roomIntentMessage: { color: "#eef5da", fontSize: 10, lineHeight: 15, marginTop: 10 },
  hostRecoveryCard: { padding: 18, borderRadius: 18, backgroundColor: "#eef5da", marginBottom: 12 }, hostRecoveryTitle: { color: "#17241d", fontSize: 20, fontWeight: "900", marginTop: 6 }, hostRecoveryBody: { color: "#48533d", fontSize: 11, lineHeight: 17, marginTop: 8 }, hostRecoveryCounts: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }, hostRecoveryCount: { borderRadius: 999, backgroundColor: "rgba(255,255,255,.9)", paddingHorizontal: 10, paddingVertical: 8 }, hostRecoveryCountText: { color: "#31411f", fontSize: 9, fontWeight: "900" }, hostRecoveryNote: { color: "#48533d", fontSize: 10, lineHeight: 15, marginTop: 10 },
  hostRequests: { padding: 18, borderRadius: 18, backgroundColor: "white", marginBottom: 12 }, hostRequestSummary: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }, hostRequestSummaryPill: { borderRadius: 999, backgroundColor: "#f4f0e7", paddingHorizontal: 10, paddingVertical: 8 }, hostRequestSummaryText: { color: "#526057", fontSize: 9, fontWeight: "900" }, hostRequestSection: { marginTop: 4, marginBottom: 12 }, hostRequestSectionTitle: { color: "#17241d", fontSize: 16, fontWeight: "900" }, hostRequestSectionBody: { color: "#657168", fontSize: 10, lineHeight: 15, marginTop: 6 }, hostRequestCard: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#edf0ed" }, hostRequestName: { color: "#17241d", fontSize: 14, fontWeight: "900" }, hostRequestMeta: { color: "#657168", fontSize: 9, textTransform: "capitalize", marginTop: 4 }, hostRequestBody: { color: "#657168", fontSize: 10, lineHeight: 15, marginTop: 9 }, hostRequestIntro: { color: "#34443a", fontSize: 11, lineHeight: 16, borderLeftWidth: 2, borderLeftColor: "#c9f458", paddingLeft: 9, marginTop: 9 }, hostRequestStatus: { color: "#7e8a82", fontSize: 9, fontWeight: "900", textTransform: "capitalize", marginTop: 10 }, hostRequestActions: { flexDirection: "row", gap: 8, marginTop: 12 }, skipButton: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: "#eeeae0" }, skipButtonText: { color: "#526057", fontSize: 9, fontWeight: "900" }, acceptButton: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: "#c9f458" }, acceptButtonText: { color: "#17241d", fontSize: 9, fontWeight: "900" },
  reflectionCard: { padding: 22, borderRadius: 24, backgroundColor: "white" }, reflectionNumber: { color: "#ff7b5f", fontSize: 11, fontWeight: "900" }, reflectionTitle: { color: "#17241d", fontSize: 25, fontWeight: "900", letterSpacing: -.7, marginTop: 26 }, reflectionBody: { color: "#69766d", fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 24 }, choiceLabel: { color: "#657168", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 8, marginBottom: 9 }, choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 }, choice: { borderWidth: 1, borderColor: "#d7ddd8", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10 }, choiceSelected: { borderColor: "#17241d", backgroundColor: "#17241d" }, choiceText: { color: "#526057", fontSize: 11, fontWeight: "700" }, choiceTextSelected: { color: "white" }, saveButton: { alignItems: "center", borderRadius: 14, backgroundColor: "#c9f458", paddingVertical: 15, marginTop: 8 }, saveButtonText: { color: "#17241d", fontSize: 13, fontWeight: "900" }, inlineMessage: { color: "#314b3a", fontSize: 10, marginTop: 10 }, safetyNote: { color: "#7e8a82", fontSize: 10, lineHeight: 15, marginTop: 14 },
  arcCard: { alignItems: "center", padding: 24, borderRadius: 28, backgroundColor: "#17241d" }, arcOrbit: { width: 172, height: 172, borderRadius: 86, borderWidth: 1, borderColor: "#708068", alignItems: "center", justifyContent: "center", marginVertical: 10 }, arcOrbitInner: { width: 124, height: 124, borderRadius: 62, borderWidth: 8, borderColor: "#c9f458", alignItems: "center", justifyContent: "center" }, arcCount: { color: "white", fontSize: 46, fontWeight: "900", lineHeight: 48 }, arcCountLabel: { color: "#9caaa0", fontSize: 8, fontWeight: "900", letterSpacing: 1.3 }, arcOverline: { color: "#c9f458", fontSize: 9, fontWeight: "900", letterSpacing: 1.3, marginTop: 22 }, arcTitle: { color: "white", fontSize: 35, fontWeight: "900", letterSpacing: -1, marginTop: 5 }, arcTrack: { width: "100%", height: 7, borderRadius: 4, overflow: "hidden", backgroundColor: "#34423a", marginTop: 24 }, arcTrackFill: { height: "100%", borderRadius: 4, backgroundColor: "#ff7b5f" }, arcStory: { color: "#d5ded8", textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 14 }, arcRule: { width: "100%", padding: 16, borderRadius: 15, backgroundColor: "#26352d", marginTop: 24 }, arcRuleTitle: { color: "#c9f458", fontSize: 11, fontWeight: "900" }, arcRuleBody: { color: "#aebbb2", fontSize: 10, lineHeight: 16, marginTop: 6 }, arcButton: { width: "100%", alignItems: "center", borderRadius: 14, backgroundColor: "#c9f458", paddingVertical: 15, marginTop: 14 }, arcButtonText: { color: "#17241d", fontWeight: "900" },
  tabBar: { position: "absolute", left: 14, right: 14, bottom: 14, flexDirection: "row", justifyContent: "space-around", borderRadius: 22, paddingVertical: 11, backgroundColor: "#17241d" }, tab: { flex: 1, alignItems: "center", gap: 5 }, tabDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "transparent" }, tabDotActive: { backgroundColor: "#c9f458" }, tabText: { color: "#829087", fontSize: 10, fontWeight: "800" }, tabTextActive: { color: "white" },
  stateCard: { alignItems: "flex-start", padding: 22, borderRadius: 22, backgroundColor: "white", gap: 9 }, stateTitle: { color: "#17241d", fontSize: 20, fontWeight: "900" }, stateBody: { color: "#657168", fontSize: 12, lineHeight: 18 }, stateAction: { borderRadius: 11, backgroundColor: "#c9f458", paddingHorizontal: 13, paddingVertical: 10, marginTop: 6 }, stateActionText: { color: "#17241d", fontSize: 11, fontWeight: "900" },
  feedbackSafetyRoute: { padding: 17, borderRadius: 18, borderWidth: 1, borderColor: "#e6b9aa", backgroundColor: "#fff3ed", marginBottom: 12 }, feedbackSafetyTitle: { color: "#713b31", fontSize: 13, fontWeight: "900" }, feedbackSafetyBody: { color: "#713b31", fontSize: 10, lineHeight: 16, marginTop: 6 },
  feedbackPanel: { padding: 20, borderRadius: 24, backgroundColor: "white" }, feedbackPanelOverline: { color: "#657168", fontSize: 8, fontWeight: "900", letterSpacing: 1.1 }, feedbackPanelTitle: { color: "#17241d", fontSize: 25, fontWeight: "900", letterSpacing: -.6, marginTop: 6 }, feedbackIntro: { color: "#657168", fontSize: 11, lineHeight: 17, marginTop: 7 },
  feedbackPrivacy: { padding: 14, borderRadius: 13, backgroundColor: "#eef5da", marginVertical: 17 }, feedbackPrivacyTitle: { color: "#31411f", fontSize: 11, fontWeight: "900" }, feedbackPrivacyBody: { color: "#526057", fontSize: 9, lineHeight: 14, marginTop: 4 },
  feedbackFieldLabel: { color: "#34443a", fontSize: 11, fontWeight: "900", marginTop: 13, marginBottom: 7 }, feedbackInput: { minHeight: 48, borderWidth: 1, borderColor: "#d1d7d2", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: "#fbfcfa", color: "#17241d" }, feedbackTextArea: { minHeight: 120, textAlignVertical: "top" }, feedbackSmallArea: { minHeight: 82, textAlignVertical: "top" }, feedbackHint: { color: "#7e8a82", fontSize: 9, lineHeight: 14, marginTop: 5 }, feedbackMessage: { color: "#435039", fontSize: 10, lineHeight: 15, marginTop: 11 },
  feedbackHistory: { padding: 20, borderRadius: 24, backgroundColor: "#e9e4d8", marginTop: 12 }, feedbackHistoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, feedbackHistoryTitle: { color: "#17241d", fontSize: 20, fontWeight: "900", marginTop: 5 }, feedbackCount: { minWidth: 31, paddingVertical: 7, borderRadius: 16, overflow: "hidden", backgroundColor: "#17241d", color: "white", textAlign: "center", fontSize: 10, fontWeight: "900" }, feedbackHistoryState: { alignItems: "flex-start", paddingVertical: 20, gap: 5 }, feedbackEmptyTitle: { color: "#17241d", fontSize: 12, fontWeight: "900" }, feedbackTicket: { padding: 15, borderRadius: 15, backgroundColor: "white", marginTop: 10 }, feedbackTicketMeta: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, feedbackTicketCategory: { flex: 1, color: "#657168", fontSize: 8, fontWeight: "900", textTransform: "uppercase", letterSpacing: .6 }, feedbackTicketStatus: { color: "#713b31", fontSize: 8, fontWeight: "900" }, feedbackTicketTitle: { color: "#17241d", fontSize: 13, fontWeight: "900", marginTop: 9 }, feedbackTicketDetail: { color: "#657168", fontSize: 9, lineHeight: 14, marginTop: 6 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12,20,15,.5)" }, safetyModal: { maxHeight: "92%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#f4f0e7", overflow: "hidden" }, safetyModalContent: { padding: 22, paddingBottom: 42 }, safetyModalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }, safetyModalOverline: { color: "#8f5a4b", fontSize: 8, fontWeight: "900", letterSpacing: 1.2 }, safetyModalTitle: { color: "#17241d", fontSize: 30, fontWeight: "900", marginTop: 5 }, modalClose: { color: "#657168", fontSize: 11, fontWeight: "900", padding: 8 }, safetyModalBody: { color: "#657168", fontSize: 11, lineHeight: 17, marginTop: 14 }, blockButton: { alignItems: "center", borderRadius: 12, paddingVertical: 13, backgroundColor: "#ffe0d4", marginVertical: 16 }, blockButtonText: { color: "#713b31", fontSize: 11, fontWeight: "900" }, reportInput: { minHeight: 120, borderWidth: 1, borderColor: "#d1d7d2", borderRadius: 14, padding: 13, backgroundColor: "white", color: "#17241d", textAlignVertical: "top" }, checkRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 14 }, checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: "#879189", borderRadius: 5 }, checkboxChecked: { borderWidth: 5, borderColor: "#17241d", backgroundColor: "#c9f458" }, checkText: { flex: 1, color: "#526057", fontSize: 10, lineHeight: 15 }, reportButton: { alignItems: "center", borderRadius: 12, paddingVertical: 14, backgroundColor: "#ff7b5f", marginTop: 16 }, reportButtonText: { color: "#32110b", fontSize: 11, fontWeight: "900" }, disabled: { opacity: .45 }, emergencyText: { color: "#713b31", fontSize: 9, lineHeight: 14, marginTop: 13 }, safetyResult: { padding: 11, borderRadius: 10, backgroundColor: "white", color: "#435039", fontSize: 10, lineHeight: 15, marginTop: 11 },
  deviceLoading: { marginTop: 24 }, deviceCard: { padding: 16, borderRadius: 14, backgroundColor: "white", marginTop: 10 }, deviceName: { color: "#17241d", fontSize: 13, fontWeight: "900" }, deviceMeta: { color: "#657168", fontSize: 9, lineHeight: 14, marginTop: 5 },
});
