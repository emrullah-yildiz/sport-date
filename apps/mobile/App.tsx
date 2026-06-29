import {
  calculateMovementProgress,
  type EventReflectionInput,
} from "@sport-date/domain";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

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
  const [tab, setTab] = useState<Tab>("discover");
  const [draftAttendance, setDraftAttendance] = useState<EventReflectionInput["attendance"]>("attended");
  const [draftAgain, setDraftAgain] = useState<EventReflectionInput["wouldJoinAgain"]>("prefer_not_to_say");
  const [reflection, setReflection] = useState<EventReflectionInput | null>(null);
  const progress = useMemo(() => calculateMovementProgress(reflection?.attendance === "attended" ? 1 : 0), [reflection]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <ScrollView contentContainerStyle={styles.screen}>
          <View style={styles.prototypeBanner}><Text style={styles.prototypeText}>INTERACTION PROTOTYPE · NOT SYNCED</Text></View>
          <View style={styles.header}>
            <View><Text style={styles.overline}>SPORT DATE</Text><Text style={styles.title}>{tab === "discover" ? "Move. Meet. Repeat." : tab === "event" ? "After the movement." : "Your Movement Arc."}</Text></View>
            <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
          </View>

          {tab === "discover" ? <DiscoverScreen onOpenEvent={() => setTab("event")} /> : null}
          {tab === "event" ? <EventDayScreen
            attendance={draftAttendance}
            wouldJoinAgain={draftAgain}
            saved={reflection !== null}
            onAttendance={setDraftAttendance}
            onAgain={setDraftAgain}
            onSave={() => { setReflection({ attendance: draftAttendance, wouldJoinAgain: draftAgain }); setTab("arc"); }}
          /> : null}
          {tab === "arc" ? <ArcScreen progress={progress} hasReflection={reflection !== null} onFindMove={() => setTab("discover")} /> : null}
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

function DiscoverScreen({ onOpenEvent }: { onOpenEvent: () => void }) {
  return <>
    <View style={styles.filterRow}><View style={styles.activeFilter}><Text style={styles.activeFilterText}>Nearby</Text></View><View style={styles.filter}><Text style={styles.filterText}>Today</Text></View><View style={styles.filter}><Text style={styles.filterText}>My level</Text></View></View>
    <Text style={styles.sectionTitle}>Made for your pace</Text>
    {events.map((event, index) => <Pressable accessibilityRole="button" accessibilityLabel={`Open ${event.sport} event`} onPress={index === 0 ? onOpenEvent : undefined} key={event.sport} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.eventIcon, { backgroundColor: event.color }]}><Text style={styles.eventIconText}>{event.icon}</Text></View>
      <View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.sport}</Text><Text style={styles.eventPlace}>{event.place}</Text><Text style={styles.eventTime}>{event.time}</Text></View><Text style={styles.arrow}>›</Text>
    </Pressable>)}
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}><Text style={styles.createButtonText}>＋ Create an event</Text></Pressable>
  </>;
}

function EventDayScreen({ attendance, wouldJoinAgain, saved, onAttendance, onAgain, onSave }: {
  attendance: EventReflectionInput["attendance"];
  wouldJoinAgain: EventReflectionInput["wouldJoinAgain"];
  saved: boolean;
  onAttendance: (value: EventReflectionInput["attendance"]) => void;
  onAgain: (value: EventReflectionInput["wouldJoinAgain"]) => void;
  onSave: () => void;
}) {
  return <>
    <View style={styles.eventHero}><Text style={styles.eventHeroOverline}>DEMO EVENT · ENDED</Text><Text style={styles.eventHeroTitle}>An easy evening rally</Text><Text style={styles.eventHeroMeta}>Tennis · Tineretului · four places</Text></View>
    <View style={styles.reflectionCard}>
      <Text style={styles.reflectionNumber}>01</Text><Text style={styles.reflectionTitle}>What actually happened?</Text><Text style={styles.reflectionBody}>Private reflection only. This is not a public rating and it does not replace a safety report.</Text>
      <Text style={styles.choiceLabel}>MY ATTENDANCE</Text><ChoiceRow choices={attendanceChoices} selected={attendance} onSelect={onAttendance} />
      <Text style={styles.choiceLabel}>WOULD I JOIN THIS GROUP AGAIN?</Text><ChoiceRow choices={againChoices} selected={wouldJoinAgain} onSelect={onAgain} />
      <Pressable accessibilityRole="button" onPress={onSave} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}><Text style={styles.saveButtonText}>{saved ? "Update local reflection" : "Save and see my arc"}</Text></Pressable>
      <Text style={styles.safetyNote}>Leaving early or not attending creates no penalty. If something felt unsafe, use reporting—not this reflection.</Text>
    </View>
  </>;
}

function ChoiceRow<T extends string>({ choices, selected, onSelect }: { choices: Array<{ value: T; label: string }>; selected: T; onSelect: (value: T) => void }) {
  return <View style={styles.choiceRow}>{choices.map((choice) => <Pressable key={choice.value} accessibilityRole="radio" accessibilityState={{ checked: selected === choice.value }} onPress={() => onSelect(choice.value)} style={[styles.choice, selected === choice.value && styles.choiceSelected]}><Text style={[styles.choiceText, selected === choice.value && styles.choiceTextSelected]}>{choice.label}</Text></Pressable>)}</View>;
}

function ArcScreen({ progress, hasReflection, onFindMove }: { progress: ReturnType<typeof calculateMovementProgress>; hasReflection: boolean; onFindMove: () => void }) {
  return <View style={styles.arcCard}>
    <View style={styles.arcOrbit}><View style={styles.arcOrbitInner}><Text style={styles.arcCount}>{progress.attendedMoves}</Text><Text style={styles.arcCountLabel}>MOVES</Text></View></View>
    <Text style={styles.arcOverline}>CURRENT STAGE</Text><Text style={styles.arcTitle}>{progress.currentStage.label}</Text>
    <View style={styles.arcTrack}><View style={[styles.arcTrackFill, { width: `${progress.stageProgressPercent}%` }]} /></View>
    <Text style={styles.arcStory}>{progress.nextStage ? `${progress.movesToNextStage} more ${progress.movesToNextStage === 1 ? "move" : "moves"} to reach ${progress.nextStage.label}.` : "Keep choosing movement that feels worthwhile. There is no leaderboard to chase."}</Text>
    <View style={styles.arcRule}><Text style={styles.arcRuleTitle}>{hasReflection ? "Based on this local demo reflection" : "Nothing manufactured"}</Text><Text style={styles.arcRuleBody}>Only self-confirmed attendance after a qualified event advances the real product. No points for swipes, skips, rejection, or daily login.</Text></View>
    <Pressable accessibilityRole="button" onPress={onFindMove} style={({ pressed }) => [styles.arcButton, pressed && styles.pressed]}><Text style={styles.arcButtonText}>Find another move</Text></Pressable>
  </View>;
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.tab}><View style={[styles.tabDot, active && styles.tabDotActive]} /><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f0e7" }, appShell: { flex: 1 }, screen: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 120 },
  prototypeBanner: { alignSelf: "flex-start", borderRadius: 20, backgroundColor: "#ffe0d4", paddingHorizontal: 10, paddingVertical: 6, marginBottom: 18 }, prototypeText: { color: "#713b31", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }, overline: { color: "#657168", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }, title: { maxWidth: 280, color: "#17241d", fontSize: 30, fontWeight: "900", letterSpacing: -1.2, marginTop: 5 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#17241d", alignItems: "center", justifyContent: "center" }, avatarText: { color: "#c9f458", fontWeight: "900" },
  filterRow: { flexDirection: "row", gap: 9, marginBottom: 34 }, filter: { borderWidth: 1, borderColor: "#c8cdc8", borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10 }, activeFilter: { borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#17241d" }, filterText: { color: "#526057", fontSize: 12, fontWeight: "700" }, activeFilterText: { color: "white", fontSize: 12, fontWeight: "800" }, sectionTitle: { color: "#17241d", fontSize: 20, fontWeight: "900", marginBottom: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 22, padding: 14, marginBottom: 11 }, eventIcon: { width: 62, height: 72, borderRadius: 17, alignItems: "center", justifyContent: "center" }, eventIconText: { color: "#17241d", fontSize: 25, fontWeight: "900" }, eventCopy: { flex: 1, paddingHorizontal: 14 }, eventTitle: { fontSize: 17, fontWeight: "900", color: "#17241d" }, eventPlace: { color: "#707b73", fontSize: 11, marginTop: 5 }, eventTime: { color: "#314b3a", fontSize: 11, fontWeight: "800", marginTop: 6 }, arrow: { color: "#627067", fontSize: 28 }, createButton: { backgroundColor: "#c9f458", borderRadius: 18, alignItems: "center", paddingVertical: 17, marginTop: 16 }, createButtonText: { color: "#17241d", fontWeight: "900", fontSize: 15 }, pressed: { opacity: .72 },
  eventHero: { padding: 22, borderRadius: 24, backgroundColor: "#17241d", marginBottom: 12 }, eventHeroOverline: { color: "#c9f458", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 }, eventHeroTitle: { color: "white", fontSize: 30, lineHeight: 31, fontWeight: "900", letterSpacing: -1, marginTop: 30 }, eventHeroMeta: { color: "#b7c3bb", fontSize: 11, marginTop: 9 },
  reflectionCard: { padding: 22, borderRadius: 24, backgroundColor: "white" }, reflectionNumber: { color: "#ff7b5f", fontSize: 11, fontWeight: "900" }, reflectionTitle: { color: "#17241d", fontSize: 25, fontWeight: "900", letterSpacing: -.7, marginTop: 26 }, reflectionBody: { color: "#69766d", fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 24 }, choiceLabel: { color: "#657168", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 8, marginBottom: 9 }, choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 }, choice: { borderWidth: 1, borderColor: "#d7ddd8", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10 }, choiceSelected: { borderColor: "#17241d", backgroundColor: "#17241d" }, choiceText: { color: "#526057", fontSize: 11, fontWeight: "700" }, choiceTextSelected: { color: "white" }, saveButton: { alignItems: "center", borderRadius: 14, backgroundColor: "#c9f458", paddingVertical: 15, marginTop: 8 }, saveButtonText: { color: "#17241d", fontSize: 13, fontWeight: "900" }, safetyNote: { color: "#7e8a82", fontSize: 10, lineHeight: 15, marginTop: 14 },
  arcCard: { alignItems: "center", padding: 24, borderRadius: 28, backgroundColor: "#17241d" }, arcOrbit: { width: 172, height: 172, borderRadius: 86, borderWidth: 1, borderColor: "#708068", alignItems: "center", justifyContent: "center", marginVertical: 10 }, arcOrbitInner: { width: 124, height: 124, borderRadius: 62, borderWidth: 8, borderColor: "#c9f458", alignItems: "center", justifyContent: "center" }, arcCount: { color: "white", fontSize: 46, fontWeight: "900", lineHeight: 48 }, arcCountLabel: { color: "#9caaa0", fontSize: 8, fontWeight: "900", letterSpacing: 1.3 }, arcOverline: { color: "#c9f458", fontSize: 9, fontWeight: "900", letterSpacing: 1.3, marginTop: 22 }, arcTitle: { color: "white", fontSize: 35, fontWeight: "900", letterSpacing: -1, marginTop: 5 }, arcTrack: { width: "100%", height: 7, borderRadius: 4, overflow: "hidden", backgroundColor: "#34423a", marginTop: 24 }, arcTrackFill: { height: "100%", borderRadius: 4, backgroundColor: "#ff7b5f" }, arcStory: { color: "#d5ded8", textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 14 }, arcRule: { width: "100%", padding: 16, borderRadius: 15, backgroundColor: "#26352d", marginTop: 24 }, arcRuleTitle: { color: "#c9f458", fontSize: 11, fontWeight: "900" }, arcRuleBody: { color: "#aebbb2", fontSize: 10, lineHeight: 16, marginTop: 6 }, arcButton: { width: "100%", alignItems: "center", borderRadius: 14, backgroundColor: "#c9f458", paddingVertical: 15, marginTop: 14 }, arcButtonText: { color: "#17241d", fontWeight: "900" },
  tabBar: { position: "absolute", left: 14, right: 14, bottom: 14, flexDirection: "row", justifyContent: "space-around", borderRadius: 22, paddingVertical: 11, backgroundColor: "#17241d" }, tab: { flex: 1, alignItems: "center", gap: 5 }, tabDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "transparent" }, tabDotActive: { backgroundColor: "#c9f458" }, tabText: { color: "#829087", fontSize: 10, fontWeight: "800" }, tabTextActive: { color: "white" },
});
