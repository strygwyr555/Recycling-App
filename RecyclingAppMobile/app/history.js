import { useRouter, useFocusEffect } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
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

      const scansRef = collection(db, "scan");
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

  // Re-fetch when the screen is focused (so new scans appear when returning)
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory().then(() => setRefreshing(false));
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login_app");
    } catch (err) {
      console.error("Error logging out:", err);
      alert("Failed to log out. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/dashboard")} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Scan History</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* History List */}
      {historyData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.noDataText}>No scans yet. Start scanning to see your history!</Text>
        </View>
      ) : (
        <FlatList
          data={historyData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              {item.imageUrl && (
                <View style={styles.imageContainer}>
                  <Text style={styles.itemImage}>📷 Image captured</Text>
                </View>
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemText}>
                  <Text style={{ fontWeight: "700" }}>Item:</Text> {item.biological || "Unknown"}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={{ fontWeight: "700" }}>Disposal:</Text> {item.disposalInstruction || "N/A"}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={{ fontWeight: "700" }}>Confidence:</Text> {item.confidence ? item.confidence.toFixed(0) + "%" : "N/A"}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={{ fontWeight: "700" }}>Points:</Text> {item.points || 10}
                </Text>
                <Text style={styles.itemText}>
                  <Text style={{ fontWeight: "700" }}>Date:</Text> {parseTimestamp(item.timestamp)}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.historyGrid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: Platform.OS === "android" ? 24 : 40 },
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
  backButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#333", flex: 1, textAlign: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  historyGrid: { padding: 16 },
  historyItem: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60",
  },
  imageContainer: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  itemImage: { width: "100%", fontSize: 12, color: "#666", marginBottom: 10 },
  itemDetails: { gap: 4 },
  itemText: { fontSize: 14, color: "#333" },
  noDataText: { textAlign: "center", padding: 20, fontSize: 16, color: "#666" },
});