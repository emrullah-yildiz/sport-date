import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const events = [
  { icon: "↗", sport: "Tennis", place: "Tineretului · 2.3 km", time: "Today · 19:00", color: "#dff59e" },
  { icon: "≈", sport: "Morning run", place: "Herăstrău · 4.1 km", time: "Saturday · 08:30", color: "#d7e7ff" },
  { icon: "◆", sport: "Bouldering", place: "Grozăvești · 3.7 km", time: "Sunday · 16:00", color: "#ffdcd2" },
];

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.header}>
          <View><Text style={styles.overline}>GOOD EVENING</Text><Text style={styles.title}>Move. Meet. Repeat.</Text></View>
          <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.activeFilter}><Text style={styles.activeFilterText}>Nearby</Text></View>
          <View style={styles.filter}><Text style={styles.filterText}>Today</Text></View>
          <View style={styles.filter}><Text style={styles.filterText}>My level</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Made for your pace</Text>
        {events.map((event) => (
          <TouchableOpacity accessibilityRole="button" key={event.sport} style={styles.card}>
            <View style={[styles.eventIcon, { backgroundColor: event.color }]}><Text style={styles.eventIconText}>{event.icon}</Text></View>
            <View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.sport}</Text><Text style={styles.eventPlace}>{event.place}</Text><Text style={styles.eventTime}>{event.time}</Text></View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity accessibilityRole="button" style={styles.createButton}><Text style={styles.createButtonText}>＋ Create an event</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f0e7" },
  screen: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  overline: { color: "#657168", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#17241d", fontSize: 30, fontWeight: "900", letterSpacing: -1.2, marginTop: 5 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#17241d", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#c9f458", fontWeight: "900" },
  filterRow: { flexDirection: "row", gap: 9, marginBottom: 34 },
  filter: { borderWidth: 1, borderColor: "#c8cdc8", borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10 },
  activeFilter: { borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#17241d" },
  filterText: { color: "#526057", fontSize: 12, fontWeight: "700" }, activeFilterText: { color: "white", fontSize: 12, fontWeight: "800" },
  sectionTitle: { color: "#17241d", fontSize: 20, fontWeight: "900", marginBottom: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 22, padding: 14, marginBottom: 11 },
  eventIcon: { width: 62, height: 72, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  eventIconText: { color: "#17241d", fontSize: 25, fontWeight: "900" },
  eventCopy: { flex: 1, paddingHorizontal: 14 }, eventTitle: { fontSize: 17, fontWeight: "900", color: "#17241d" },
  eventPlace: { color: "#707b73", fontSize: 11, marginTop: 5 }, eventTime: { color: "#314b3a", fontSize: 11, fontWeight: "800", marginTop: 6 },
  arrow: { color: "#627067", fontSize: 28 },
  createButton: { backgroundColor: "#c9f458", borderRadius: 18, alignItems: "center", paddingVertical: 17, marginTop: 16 },
  createButtonText: { color: "#17241d", fontWeight: "900", fontSize: 15 },
});
