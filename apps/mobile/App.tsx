import {
  calculateMovementProgress,
  type EventReflectionInput,
} from "@sport-date/domain";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { loginMobile, logoutMobile, mobileApiConfigured, restoreMobileMember } from "./src/auth/session";
import { loadMobileProduct, loadMobileRoom, saveMobileReflection, type MobileMemberEvent, type MobileProductData, type MobileRoom } from "./src/api/product";

type Tab = "discover" | "event" | "arc";

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

export default function App() {
  const configured = mobileApiConfigured();
  const [authState, setAuthState] = useState<"checking" | "signed_out" | "signed_in" | "prototype">(configured ? "checking" : "prototype");
  const [memberName, setMemberName] = useState("");
  const [tab, setTab] = useState<Tab>("discover");
  const [draftAttendance, setDraftAttendance] = useState<EventReflectionInput["attendance"]>("attended");
  const [draftAgain, setDraftAgain] = useState<EventReflectionInput["wouldJoinAgain"]>("prefer_not_to_say");
  const [reflection, setReflection] = useState<EventReflectionInput | null>(null);
  const [product, setProduct] = useState<MobileProductData | null>(null);
  const [productState, setProductState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [productError, setProductError] = useState("");
  const [room, setRoom] = useState<MobileRoom | null>(null);
  const [roomState, setRoomState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedEventId, setSelectedEventId] = useState("");
  const progress = useMemo(() => calculateMovementProgress(reflection?.attendance === "attended" ? 1 : 0), [reflection]);

  const reloadProduct = useCallback(async () => {
    setProductState("loading"); setProductError("");
    try { setProduct(await loadMobileProduct()); setProductState("ready"); }
    catch (error) { setProductError(error instanceof Error ? error.message : "Live data could not be loaded."); setProductState("error"); }
  }, []);

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
  }, [authState, selectedEventId, tab]);

  if (authState === "checking") return <SafeAreaView style={styles.safeArea}><View style={styles.loading}><ActivityIndicator color="#17241d" /><Text style={styles.loadingText}>Restoring secure session...</Text></View></SafeAreaView>;
  if (authState === "signed_out") return <LoginGate onSignedIn={(firstName) => { setMemberName(firstName); setAuthState("signed_in"); }} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <ScrollView contentContainerStyle={styles.screen}>
          <View style={[styles.prototypeBanner, authState === "signed_in" && styles.liveBanner]}><Text style={[styles.prototypeText, authState === "signed_in" && styles.liveBannerText]}>{authState === "signed_in" ? "LIVE PRIVATE BETA DATA" : "INTERACTION PROTOTYPE · NOT SYNCED"}</Text></View>
          {authState === "signed_in" ? <View style={styles.sessionRow}><Text style={styles.sessionText}>Signed in as {memberName}</Text><Pressable accessibilityRole="button" onPress={() => logoutMobile().finally(() => { setMemberName(""); setAuthState("signed_out"); })}><Text style={styles.sessionAction}>Sign out</Text></Pressable></View> : null}
          <View style={styles.header}>
            <View><Text style={styles.overline}>SPORT DATE</Text><Text style={styles.title}>{tab === "discover" ? "Move. Meet. Repeat." : tab === "event" ? "After the movement." : "Your Movement Arc."}</Text></View>
            <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
          </View>

          {authState === "signed_in" && (productState === "loading" || productState === "idle") ? <StateCard title="Loading your movement" body="Fetching approximate discovery, your event access, and private progress." loading /> : null}
          {authState === "signed_in" && productState === "error" ? <StateCard title="The connection lost its rhythm" body={productError} action="Try again" onAction={() => void reloadProduct()} /> : null}
          {(authState !== "signed_in" || productState === "ready") && tab === "discover" ? <DiscoverScreen
            live={authState === "signed_in"}
            items={authState === "signed_in" ? (product?.discovery ?? []).map((event) => ({
              id: event.id, icon: "↗", sport: event.sport, title: event.title,
              place: `${event.areaLabel}, ${event.city} · approximate`, time: new Date(event.startsAt).toLocaleString(), color: "#dff59e",
              footnote: `${event.placesRemaining} places · hosted by ${event.hostFirstName}`,
            })) : events.map((event) => ({ ...event, id: event.sport, title: event.sport, footnote: "Demo event" }))}
            onOpenEvent={() => setTab("event")}
          /> : null}
          {(authState !== "signed_in" || productState === "ready") && tab === "event" ? authState === "signed_in"
            ? product?.events.length ? <><EventSelector events={product.events} selectedId={selectedEventId} onSelect={setSelectedEventId} />{roomState === "loading" || roomState === "idle"
              ? <StateCard title="Opening your event room" body="Exact logistics are fetched only for this authorized view." loading />
              : roomState === "error" || !room ? <StateCard title="Room access unavailable" body="Your session may be stale or event access may have changed." action="Back to discovery" onAction={() => setTab("discover")} />
              : <EventDayScreen
                live eventTitle={room.title} eventMeta={`${room.sport} · ${room.isHost ? "hosting" : "accepted participant"}`}
                venue={`${room.venueName} · ${room.address}`} hasEnded={room.hasEnded}
                attendance={draftAttendance}
                wouldJoinAgain={draftAgain}
                saved={room.reflection !== null} onAttendance={setDraftAttendance} onAgain={setDraftAgain}
                onSave={async () => { await saveMobileReflection(room.id, { attendance: draftAttendance, wouldJoinAgain: draftAgain }); await reloadProduct(); setTab("arc"); }}
              />}</>
            : <StateCard title="No event-day room yet" body="Accepted and hosted events will appear here without exposing an address in discovery." action="Discover events" onAction={() => setTab("discover")} />
            : <EventDayScreen live={false} eventTitle="An easy evening rally" eventMeta="Tennis · Tineretului · four places" venue={null} hasEnded attendance={draftAttendance} wouldJoinAgain={draftAgain} saved={reflection !== null} onAttendance={setDraftAttendance} onAgain={setDraftAgain} onSave={() => { setReflection({ attendance: draftAttendance, wouldJoinAgain: draftAgain }); setTab("arc"); }} /> : null}
          {(authState !== "signed_in" || productState === "ready") && tab === "arc" ? <ArcScreen progress={authState === "signed_in" && product ? product.progress : progress} hasReflection={authState === "signed_in" ? (product?.progress.attendedMoves ?? 0) > 0 : reflection !== null} live={authState === "signed_in"} onFindMove={() => setTab("discover")} /> : null}
        </ScrollView>

        <View style={styles.tabBar} accessibilityRole="tablist">
          <TabButton label="Discover" active={tab === "discover"} onPress={() => setTab("discover")} />
          <TabButton label="Event day" active={tab === "event"} onPress={() => setTab("event")} />
          <TabButton label="My arc" active={tab === "arc"} onPress={() => setTab("arc")} />
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

type DisplayEvent = { id: string; icon: string; sport: string; title: string; place: string; time: string; color: string; footnote: string };

function DiscoverScreen({ items, live, onOpenEvent }: { items: DisplayEvent[]; live: boolean; onOpenEvent: () => void }) {
  return <>
    <View style={styles.filterRow}><View style={styles.activeFilter}><Text style={styles.activeFilterText}>Nearby</Text></View><View style={styles.filter}><Text style={styles.filterText}>Today</Text></View><View style={styles.filter}><Text style={styles.filterText}>My level</Text></View></View>
    <Text style={styles.sectionTitle}>Made for your pace</Text>
    {items.length === 0 ? <StateCard title="No compatible events this week" body="Try a wider time window on web while mobile filters are being connected." /> : items.map((event, index) => <Pressable accessibilityRole="button" accessibilityLabel={`${event.sport}: ${event.title}`} accessibilityState={{ disabled: live }} disabled={live} onPress={!live && index === 0 ? onOpenEvent : undefined} key={event.id} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.eventIcon, { backgroundColor: event.color }]}><Text style={styles.eventIconText}>{event.icon}</Text></View>
      <View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventPlace}>{event.sport} · {event.place}</Text><Text style={styles.eventTime}>{event.time}</Text><Text style={styles.eventFootnote}>{event.footnote}</Text></View>{live ? null : <Text style={styles.arrow}>›</Text>}
    </Pressable>)}
    {live ? <Text style={styles.liveLimit}>Live discovery is read-only in this slice. Request controls remain on web until the native mutation flow receives abuse and recovery testing.</Text> : <Pressable accessibilityRole="button" style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}><Text style={styles.createButtonText}>＋ Create an event</Text></Pressable>}
  </>;
}

function EventDayScreen({ live, eventTitle, eventMeta, venue, hasEnded, attendance, wouldJoinAgain, saved, onAttendance, onAgain, onSave }: {
  live: boolean; eventTitle: string; eventMeta: string; venue: string | null; hasEnded: boolean;
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

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.tab}><View style={[styles.tabDot, active && styles.tabDotActive]} /><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f0e7" }, appShell: { flex: 1 }, screen: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 120 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, loadingText: { color: "#657168", fontSize: 12, fontWeight: "700" },
  loginScreen: { flex: 1, justifyContent: "center", paddingHorizontal: 25 }, loginOverline: { color: "#657168", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }, loginTitle: { maxWidth: 330, color: "#17241d", fontSize: 42, lineHeight: 42, fontWeight: "900", letterSpacing: -1.8, marginTop: 10 }, loginBody: { color: "#657168", fontSize: 12, lineHeight: 19, marginTop: 15, marginBottom: 26 }, loginInput: { minHeight: 52, borderWidth: 1, borderColor: "#d1d7d2", borderRadius: 15, paddingHorizontal: 15, backgroundColor: "white", color: "#17241d", marginBottom: 10 }, loginButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#17241d", marginTop: 3 }, loginButtonText: { color: "#c9f458", fontWeight: "900" }, loginError: { color: "#8f2a2a", fontSize: 11, lineHeight: 16, marginTop: 12 },
  prototypeBanner: { alignSelf: "flex-start", borderRadius: 20, backgroundColor: "#ffe0d4", paddingHorizontal: 10, paddingVertical: 6, marginBottom: 18 }, prototypeText: { color: "#713b31", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  liveBanner: { backgroundColor: "#dff59e" }, liveBannerText: { color: "#31411f" },
  sessionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: -8, marginBottom: 19 }, sessionText: { color: "#657168", fontSize: 10, fontWeight: "700" }, sessionAction: { color: "#713b31", fontSize: 10, fontWeight: "900" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }, overline: { color: "#657168", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }, title: { maxWidth: 280, color: "#17241d", fontSize: 30, fontWeight: "900", letterSpacing: -1.2, marginTop: 5 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#17241d", alignItems: "center", justifyContent: "center" }, avatarText: { color: "#c9f458", fontWeight: "900" },
  filterRow: { flexDirection: "row", gap: 9, marginBottom: 34 }, filter: { borderWidth: 1, borderColor: "#c8cdc8", borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10 }, activeFilter: { borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#17241d" }, filterText: { color: "#526057", fontSize: 12, fontWeight: "700" }, activeFilterText: { color: "white", fontSize: 12, fontWeight: "800" }, sectionTitle: { color: "#17241d", fontSize: 20, fontWeight: "900", marginBottom: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 22, padding: 14, marginBottom: 11 }, eventIcon: { width: 62, height: 72, borderRadius: 17, alignItems: "center", justifyContent: "center" }, eventIconText: { color: "#17241d", fontSize: 25, fontWeight: "900" }, eventCopy: { flex: 1, paddingHorizontal: 14 }, eventTitle: { fontSize: 17, fontWeight: "900", color: "#17241d" }, eventPlace: { color: "#707b73", fontSize: 11, marginTop: 5 }, eventTime: { color: "#314b3a", fontSize: 11, fontWeight: "800", marginTop: 6 }, eventFootnote: { color: "#879189", fontSize: 9, marginTop: 5 }, liveLimit: { color: "#657168", fontSize: 10, lineHeight: 15, marginTop: 10 }, arrow: { color: "#627067", fontSize: 28 }, createButton: { backgroundColor: "#c9f458", borderRadius: 18, alignItems: "center", paddingVertical: 17, marginTop: 16 }, createButtonText: { color: "#17241d", fontWeight: "900", fontSize: 15 }, pressed: { opacity: .72 },
  eventHero: { padding: 22, borderRadius: 24, backgroundColor: "#17241d", marginBottom: 12 }, eventHeroOverline: { color: "#c9f458", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 }, eventHeroTitle: { color: "white", fontSize: 30, lineHeight: 31, fontWeight: "900", letterSpacing: -1, marginTop: 30 }, eventHeroMeta: { color: "#b7c3bb", fontSize: 11, marginTop: 9 }, eventVenue: { color: "white", fontSize: 12, lineHeight: 18, fontWeight: "800", marginTop: 22 },
  eventSelector: { marginBottom: 8 }, eventChoice: { maxWidth: 190, borderWidth: 1, borderColor: "#c8d0ca", borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "white" }, eventChoiceSelected: { borderColor: "#17241d", backgroundColor: "#17241d" }, eventChoiceTitle: { maxWidth: 150, color: "#17241d", fontSize: 11, fontWeight: "900" }, eventChoiceMeta: { color: "#78837b", fontSize: 8, marginTop: 4 }, eventChoiceMetaSelected: { color: "#aebbb2" },
  reflectionCard: { padding: 22, borderRadius: 24, backgroundColor: "white" }, reflectionNumber: { color: "#ff7b5f", fontSize: 11, fontWeight: "900" }, reflectionTitle: { color: "#17241d", fontSize: 25, fontWeight: "900", letterSpacing: -.7, marginTop: 26 }, reflectionBody: { color: "#69766d", fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 24 }, choiceLabel: { color: "#657168", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 8, marginBottom: 9 }, choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 }, choice: { borderWidth: 1, borderColor: "#d7ddd8", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10 }, choiceSelected: { borderColor: "#17241d", backgroundColor: "#17241d" }, choiceText: { color: "#526057", fontSize: 11, fontWeight: "700" }, choiceTextSelected: { color: "white" }, saveButton: { alignItems: "center", borderRadius: 14, backgroundColor: "#c9f458", paddingVertical: 15, marginTop: 8 }, saveButtonText: { color: "#17241d", fontSize: 13, fontWeight: "900" }, inlineMessage: { color: "#314b3a", fontSize: 10, marginTop: 10 }, safetyNote: { color: "#7e8a82", fontSize: 10, lineHeight: 15, marginTop: 14 },
  arcCard: { alignItems: "center", padding: 24, borderRadius: 28, backgroundColor: "#17241d" }, arcOrbit: { width: 172, height: 172, borderRadius: 86, borderWidth: 1, borderColor: "#708068", alignItems: "center", justifyContent: "center", marginVertical: 10 }, arcOrbitInner: { width: 124, height: 124, borderRadius: 62, borderWidth: 8, borderColor: "#c9f458", alignItems: "center", justifyContent: "center" }, arcCount: { color: "white", fontSize: 46, fontWeight: "900", lineHeight: 48 }, arcCountLabel: { color: "#9caaa0", fontSize: 8, fontWeight: "900", letterSpacing: 1.3 }, arcOverline: { color: "#c9f458", fontSize: 9, fontWeight: "900", letterSpacing: 1.3, marginTop: 22 }, arcTitle: { color: "white", fontSize: 35, fontWeight: "900", letterSpacing: -1, marginTop: 5 }, arcTrack: { width: "100%", height: 7, borderRadius: 4, overflow: "hidden", backgroundColor: "#34423a", marginTop: 24 }, arcTrackFill: { height: "100%", borderRadius: 4, backgroundColor: "#ff7b5f" }, arcStory: { color: "#d5ded8", textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 14 }, arcRule: { width: "100%", padding: 16, borderRadius: 15, backgroundColor: "#26352d", marginTop: 24 }, arcRuleTitle: { color: "#c9f458", fontSize: 11, fontWeight: "900" }, arcRuleBody: { color: "#aebbb2", fontSize: 10, lineHeight: 16, marginTop: 6 }, arcButton: { width: "100%", alignItems: "center", borderRadius: 14, backgroundColor: "#c9f458", paddingVertical: 15, marginTop: 14 }, arcButtonText: { color: "#17241d", fontWeight: "900" },
  tabBar: { position: "absolute", left: 14, right: 14, bottom: 14, flexDirection: "row", justifyContent: "space-around", borderRadius: 22, paddingVertical: 11, backgroundColor: "#17241d" }, tab: { flex: 1, alignItems: "center", gap: 5 }, tabDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "transparent" }, tabDotActive: { backgroundColor: "#c9f458" }, tabText: { color: "#829087", fontSize: 10, fontWeight: "800" }, tabTextActive: { color: "white" },
  stateCard: { alignItems: "flex-start", padding: 22, borderRadius: 22, backgroundColor: "white", gap: 9 }, stateTitle: { color: "#17241d", fontSize: 20, fontWeight: "900" }, stateBody: { color: "#657168", fontSize: 12, lineHeight: 18 }, stateAction: { borderRadius: 11, backgroundColor: "#c9f458", paddingHorizontal: 13, paddingVertical: 10, marginTop: 6 }, stateActionText: { color: "#17241d", fontSize: 11, fontWeight: "900" },
});
