import { useRouter, useFocusEffect } from "expo-router";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { auth, db } from "./firebaseInit";

/** --------------------------------------
 * NORMALIZE LABELS
 * Converts "paper_", "paper_waste", "Paper Waste"
 * → "Paper"
 ---------------------------------------*/
const cleanLabel = (label) => {
  if (!label) return "Unknown";

  return label
    .toLowerCase()
    .replace(/_/g, " ")           // underscores → space
    .replace(/-/g, " ")           // hyphens → space
    .replace(/\bwaste\b/gi, "")   // remove "waste"
    .replace(/\bglass\b/gi, "")   // remove "glass"
    .replace(/\s+/g, " ")         // collapse multiple spaces
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize words
};

/** --------------------------------------
 * TIMESTAMP PARSER
 * Supports Firestore Timestamp objects and strings
 ---------------------------------------*/
const formatTimestamp = (ts) => {
  if (!ts) return "Unknown";

  // Case 1: Firestore Timestamp object
  if (typeof ts === "object" && ts.seconds) {
    return new Date(ts.seconds * 1000).toLocaleString();
  }

  // Case 2: Standard string or ISO timestamp
  const parsed = new Date(ts);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleString();
  }

  return "Unknown";
};

export default function HistoryScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [orientation, setOrientation] = useState(
    width > height ? "landscape" : "portrait"
  );

  // Orientation changes
  useEffect(() => {
    const isLandscape = width > height;
    setOrientation(isLandscape ? "landscape" : "portrait");
  }, [width, height]);

  const isLandscape = orientation === "landscape";
  const isTablet = width >= 768;

  /** --------------------------------------
   * FETCH HISTORY FROM FIRESTORE
   ---------------------------------------*/
  const fetchHistory = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const user = auth.currentUser;
      if (!user) {
        console.log("❌ No user logged in");
        setLoading(false);
        return;
      }

      const scansRef = collection(db, "scan");
      let q;

      try {
        // Try orderBy first
        q = query(
          scansRef,
          where("email", "==", user.email),
          orderBy("timestamp", "desc")
        );

        const snapshot = await getDocs(q);
        setHistoryData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.log("⚠ orderBy failed, sorting manually");

        q = query(scansRef, where("email", "==", user.email));
        const snapshot = await getDocs(q);
        const scans = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        scans.sort((a, b) => {
          const t1 = new Date(a.timestamp).getTime();
          const t2 = new Date(b.timestamp).getTime();
          return t2 - t1;
        });

        setHistoryData(scans);
      }
    } catch (err) {
      console.error("❌ Error fetching history:", err);
      setError(`Error loading history: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory().then(() => setRefreshing(false));
  };

  /** --------------------------------------
   * RENDER ONE CARD
   ---------------------------------------*/
  const renderItem = ({ item }) => {
    const final = cleanLabel(item.finalSelection);
    const human = cleanLabel(item.userSelection);
    const m1 = cleanLabel(item.aiModel1Prediction);
    const m2 = cleanLabel(item.aiModel2Prediction);

    return (
      <View
        style={[
          styles.card,
          { width: isLandscape && !isTablet ? "48%" : "100%" },
        ]}
      >
        {/* IMAGE */}
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {/* INFO */}
        <View style={styles.infoContainer}>
          <Text style={styles.finalTitle}>{final}</Text>

          <Text style={styles.itemText}>
            <Text style={styles.bold}>You:</Text> {human}
          </Text>

          <Text style={styles.itemText}>
            <Text style={styles.bold}>Model 1:</Text> {m1} (
            {(item.aiModel1Confidence * 100).toFixed(0)}%)
          </Text>

          <Text style={styles.itemText}>
            <Text style={styles.bold}>Model 2:</Text> {m2} (
            {(item.aiModel2Confidence * 100).toFixed(0)}%)
          </Text>

          <Text style={styles.itemText}>
            <Text style={styles.bold}>Strength:</Text>{" "}
            {item.ensembleMetrics?.recommendationStrength || "Unknown"}
          </Text>

          <Text style={styles.itemText}>
            <Text style={styles.bold}>Date:</Text>{" "}
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  /** -------------------------------------- */
  /** UI STRUCTURE */
  /** -------------------------------------- */

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/dashboard")}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>

        <Text style={styles.headerTitle}>📜 History</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* LIST */}
      <FlatList
        data={historyData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        numColumns={isLandscape && !isTablet ? 2 : 1}
        columnWrapperStyle={
          isLandscape && !isTablet ? { justifyContent: "space-between" } : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}

/** --------------------------------------
 * STYLES
 ---------------------------------------*/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 10, color: "#666" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  backButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backButtonText: { color: "#fff", fontWeight: "700" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 20,
    color: "#333",
  },

  listContent: { padding: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },

  image: {
    width: "100%",
    height: 220,
    backgroundColor: "#eee",
  },
  imagePlaceholder: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
  },
  placeholderText: { color: "#999" },

  infoContainer: { padding: 12 },

  finalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#27ae60",
    marginBottom: 6,
  },

  itemText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  bold: {
    fontWeight: "700",
    color: "#2c3e50",
  },
});
