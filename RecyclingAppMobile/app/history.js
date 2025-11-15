import { useFocusEffect, useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "./firebaseInit";

export default function HistoryScreen() {
  const router = useRouter();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const parseTimestamp = (ts) => {
    try {
      const date = new Date(ts);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch {
      return ts;
    }
  };

  const fetchHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const scansRef = collection(db, "scans");
      const q = query(scansRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      const scans = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setHistoryData(scans.reverse());
      setLoading(false);
    } catch (err) {
      console.error("Error fetching history:", err);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory().then(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading your scan history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/dashboard")} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Scan History</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* List */}
      {historyData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.noDataText}>No scans yet. Start scanning to see your history!</Text>
        </View>
      ) : (
        <FlatList
          data={historyData}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
              )}
              <View style={styles.infoContainer}>
                <Text style={styles.itemTitle}>
                  🧠 {item.classification ? item.classification.toUpperCase() : "Unknown"}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={styles.bold}>Confidence:</Text>{" "}
                  {item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : "N/A"}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={styles.bold}>Bin:</Text> {item.bin || "N/A"}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={styles.bold}>Suggestion:</Text> {item.suggestion || "N/A"}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={styles.bold}>Date:</Text> {parseTimestamp(item.timestamp)}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? 24 : 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#27ae60",
    borderRadius: 6,
  },
  backButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#333", flex: 1, textAlign: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  noDataText: { textAlign: "center", fontSize: 16, color: "#666", marginTop: 20 },
  listContent: { padding: 16 },
  card: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
  },
  image: { width: "100%", height: 180 },
  infoContainer: { padding: 12 },
  itemTitle: { fontSize: 18, fontWeight: "700", color: "#27ae60", marginBottom: 4 },
  itemText: { fontSize: 14, color: "#333", marginBottom: 3 },
  bold: { fontWeight: "700" },
});
