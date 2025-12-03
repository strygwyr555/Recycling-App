import { useRouter, useFocusEffect } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { auth, db } from "./firebaseInit";

export default function StatisticsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalScans: 0,
    totalPoints: 0,
    itemTypes: {},
  });
  const [wasteComposition, setWasteComposition] = useState([]);
  const [orientation, setOrientation] = useState(
    width > height ? "landscape" : "portrait"
  );

  // Track orientation changes
  useEffect(() => {
    const isLandscape = width > height;
    setOrientation(isLandscape ? "landscape" : "portrait");
  }, [width, height]);

  // Responsive values
  const isLandscape = orientation === "landscape";
  const isMobileSmall = width < 375;
  const isTablet = width >= 768;

  const getResponsiveSizes = () => {
    let headerFontSize = 20;
    let cardTitleFontSize = 18;
    let statValueFontSize = 28;
    let textFontSize = 14;
    let padding = 16;
    let cardMargin = 12;

    if (isMobileSmall) {
      headerFontSize = 18;
      cardTitleFontSize = 16;
      statValueFontSize = 24;
      textFontSize = 12;
      padding = 12;
      cardMargin = 8;
    } else if (isTablet) {
      headerFontSize = 26;
      cardTitleFontSize = 22;
      statValueFontSize = 36;
      textFontSize = 16;
      padding = 20;
      cardMargin = 16;
    }

    return {
      headerFontSize,
      cardTitleFontSize,
      statValueFontSize,
      textFontSize,
      padding,
      cardMargin,
    };
  };

  const sizes = getResponsiveSizes();

  const fetchStatistics = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      // helper: extract a human-friendly label from different doc shapes
      const extractLabel = (data) => {
        if (!data) return null;
        if (data.finalSelection) return data.finalSelection;
        if (data.final) return data.final;
        if (data.classification) return data.classification;
        if (data.aiModel1Prediction) return data.aiModel1Prediction;
        if (data.aiModel2Prediction) return data.aiModel2Prediction;
        if (data.results) {
          if (data.results.mobilenet && data.results.mobilenet.prediction) return data.results.mobilenet.prediction;
          if (data.results.rexnet && data.results.rexnet.prediction) return data.results.rexnet.prediction;
        }
        if (data.prediction) return data.prediction;
        return null;
      };

      // normalize label into small key used for composition and emoji mapping
      const normalizeKey = (label) => {
        if (!label) return "unknown";
        const s = String(label).trim().toLowerCase();
        if (/^e$/.test(s) || /e[-_\s]?waste/.test(s) || /ewaste/.test(s)) return "ewaste";
        if (s.includes("glass")) return "glass";
        if (s.includes("plastic")) return "plastic";
        if (s.includes("paper") || s.includes("cardboard")) return "paper";
        if (s.includes("battery")) return "battery";
        if (s.includes("metal")) return "metal";
        if (s.includes("light") && s.includes("bulb")) return "lightbulb";
        if (s.includes("organic")) return "organic";
        if (s.includes("auto") || s.includes("vehicle") || s.includes("car")) return "automobile";
        const cleaned = s.replace(/[^a-z0-9]/g, "");
        return cleaned || "other";
      };

      // combine both collections `scan` and `scans` to match web behavior
      const collectionsToQuery = ["scan", "scans"];
      let totalPoints = 0;
      let totalScans = 0;
      const itemTypes = {};

      for (const colName of collectionsToQuery) {
        try {
          const ref = collection(db, colName);
          const q = query(ref, where("email", "==", user.email));
          const snap = await getDocs(q);
          snap.docs.forEach((doc) => {
            totalScans += 1;
            const data = doc.data();
            totalPoints += data.points || 0;

            const label = extractLabel(data);
            const key = normalizeKey(label);
            itemTypes[key] = (itemTypes[key] || 0) + 1;
          });
        } catch (err) {
          console.warn(`Skipping collection ${colName}:`, err.message || err);
        }
      }

      const composition = Object.entries(itemTypes).map(([type, count]) => ({
        type,
        count,
      }));

      setStats({
        totalScans,
        totalPoints,
        itemTypes,
      });

      setWasteComposition(composition);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatistics();
    }, [fetchStatistics])
  );

  const getImpactEmoji = (type) => {
    const emojiMap = {
      plastic: "🟦",
      metal: "⬜",
      paper: "📄",
      battery: "🔋",
      glass: "🟩",
      automobile: "🚗",
      organic: "🟫",
      ewaste: "💻",
      lightbulb: "💡",
    };
    return emojiMap[type] || "♻️";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={[styles.loadingText, { fontSize: sizes.textFontSize }]}>
          Loading statistics...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View
        style={[
          styles.header,
          {
            padding: sizes.padding,
            paddingHorizontal: sizes.padding * 1.33,
          },
        ]}
      >
        <Pressable
          onPress={() => router.push("/dashboard")}
          style={[styles.backButton, { paddingHorizontal: sizes.padding }]}
        >
          <Text style={[styles.backButtonText, { fontSize: sizes.textFontSize }]}>
            ← Back
          </Text>
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { fontSize: sizes.headerFontSize, flex: 1, marginHorizontal: 12 },
          ]}
        >
          📊 Statistics
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { padding: sizes.padding, paddingBottom: sizes.padding * 2 },
        ]}
      >
        {/* Overview Cards */}
        <View
          style={[
            styles.card,
            {
              marginBottom: sizes.cardMargin,
              padding: sizes.padding,
              flexDirection: isLandscape ? "row" : "column",
            },
          ]}
        >
          <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding }]}>
            Your Impact Overview
          </Text>
          <View
            style={[
              styles.statsGrid,
              { flexDirection: isLandscape ? "row" : "column" },
            ]}
          >
            <View style={[styles.statCard, { marginRight: isLandscape ? sizes.padding : 0 }]}>
              <Text style={styles.statIcon}>♻️</Text>
              <Text style={[styles.statValue, { fontSize: sizes.statValueFontSize }]}>
                {stats.totalScans}
              </Text>
              <Text style={[styles.statLabel, { fontSize: sizes.textFontSize }]}>
                Total Scans
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>⭐</Text>
              <Text style={[styles.statValue, { fontSize: sizes.statValueFontSize }]}>
                {stats.totalPoints}
              </Text>
              <Text style={[styles.statLabel, { fontSize: sizes.textFontSize }]}>
                Points Earned
              </Text>
            </View>
          </View>
        </View>

        {/* Waste Composition */}
        <View style={[styles.card, { marginBottom: sizes.cardMargin, padding: sizes.padding }]}>
          <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding }]}>
            Waste Composition Breakdown
          </Text>
          {wasteComposition.length === 0 ? (
            <Text style={[styles.noDataText, { fontSize: sizes.textFontSize }]}>
              No scans yet. Start scanning to see your breakdown!
            </Text>
          ) : (
            <View>
              {wasteComposition.map((item) => (
                <View key={item.type} style={[styles.compositionItem, { paddingVertical: sizes.padding * 0.75 }]}>
                  <View style={styles.compositionLeft}>
                    <Text style={styles.compositionEmoji}>
                      {getImpactEmoji(item.type)}
                    </Text>
                    <Text
                      style={[
                        styles.compositionType,
                        { fontSize: sizes.textFontSize, marginLeft: sizes.padding * 0.5 },
                      ]}
                    >
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.compositionRight}>
                    <Text
                      style={[styles.compositionCount, { fontSize: sizes.textFontSize }]}
                    >
                      {item.count}
                    </Text>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${(item.count / stats.totalScans) * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Environmental Impact */}
        <View
          style={[
            styles.card,
            {
              marginBottom: sizes.cardMargin,
              padding: sizes.padding,
              backgroundColor: "#e8f8f5",
            },
          ]}
        >
          <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize }]}>
            🌍 Environmental Impact
          </Text>
          <Text style={[styles.impactText, { fontSize: sizes.textFontSize }]}>
            By recycling{" "}
            <Text style={styles.bold}>{stats.totalScans}</Text> items, you've helped reduce
            waste and protect our planet!
          </Text>
          <Text style={[styles.impactText, { fontSize: sizes.textFontSize, marginTop: sizes.padding * 0.5 }]}>
            Your contribution:{" "}
            <Text style={styles.bold}>
              {stats.totalPoints} environmental points
            </Text>
          </Text>
        </View>

        {/* Action Buttons */}
        <View
          style={[
            styles.buttonContainer,
            { gap: sizes.padding, marginBottom: sizes.padding },
          ]}
        >
          <Pressable
            style={[styles.button, styles.historyButton]}
            onPress={() => router.push("/history")}
          >
            <Text style={[styles.buttonText, { fontSize: sizes.textFontSize }]}>
              View Full History
            </Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.dashboardButton]}
            onPress={() => router.push("/dashboard")}
          >
            <Text style={[styles.buttonText, { fontSize: sizes.textFontSize }]}>
              Back to Dashboard
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: { marginTop: 12, color: "#666" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  backButton: {
    paddingVertical: 10,
    backgroundColor: "#27ae60",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: { color: "white", fontWeight: "700" },
  headerTitle: { fontWeight: "bold", color: "#333", textAlign: "center" },
  scrollContent: {},
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 3px rgba(0,0,0,0.1)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        }),
  },
  cardTitle: { fontWeight: "700", color: "#2c3e50" },
  statsGrid: { justifyContent: "space-around" },
  statCard: { alignItems: "center", flex: 1 },
  statIcon: { fontSize: 32, marginBottom: 8 },
  statValue: { fontWeight: "700", color: "#27ae60", marginBottom: 4 },
  statLabel: { color: "#7f8c8d", textAlign: "center" },
  compositionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  compositionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  compositionEmoji: { fontSize: 24 },
  compositionType: { fontWeight: "600", color: "#333" },
  compositionRight: { flex: 1, alignItems: "flex-end" },
  compositionCount: { fontWeight: "700", color: "#27ae60", marginBottom: 4 },
  progressBar: { height: 6, backgroundColor: "#27ae60", borderRadius: 3, minWidth: 40 },
  noDataText: { color: "#999", textAlign: "center", paddingVertical: 20 },
  impactText: { color: "#27ae60", lineHeight: 22, marginBottom: 8 },
  bold: { fontWeight: "700" },
  buttonContainer: { marginTop: 12 },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  historyButton: { backgroundColor: "#27ae60" },
  dashboardButton: { backgroundColor: "#3498db" },
  buttonText: { color: "white", fontWeight: "700" },
});