import { useRouter, useFocusEffect } from "expo-router";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Orientation,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { auth, db } from "./firebaseInit";

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

  // Track orientation changes
  useEffect(() => {
    const isLandscape = width > height;
    setOrientation(isLandscape ? "landscape" : "portrait");
  }, [width, height]);

  // Responsive values
  const isLandscape = orientation === "landscape";
  const isMobileSmall = width < 375;
  const isTablet = width >= 768;

  // Calculate responsive sizes
  const getResponsiveSizes = () => {
    let headerFontSize = 18;
    let titleFontSize = 16;
    let textFontSize = 13;
    let imageHeight = 200;
    let cardMargin = 12;
    let padding = 12;

    if (isMobileSmall) {
      headerFontSize = 16;
      titleFontSize = 14;
      textFontSize = 12;
      imageHeight = 150;
      cardMargin = 8;
      padding = 10;
    } else if (isTablet) {
      headerFontSize = 24;
      titleFontSize = 18;
      textFontSize = 15;
      imageHeight = 300;
      cardMargin = 16;
      padding = 16;
    }

    if (isLandscape && !isTablet) {
      imageHeight = height * 0.4;
    }

    return {
      headerFontSize,
      titleFontSize,
      textFontSize,
      imageHeight,
      cardMargin,
      padding,
    };
  };

  const sizes = getResponsiveSizes();

  const parseTimestamp = (ts) => {
    try {
      if (!ts) return "Unknown date";
      const date = new Date(ts);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch {
      return ts;
    }
  };

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

      console.log("🔍 Fetching history for user email:", user.email);

      const scansRef = collection(db, "scan");

      try {
        const q = query(
          scansRef,
          where("email", "==", user.email),
          orderBy("timestamp", "desc")
        );

        const querySnapshot = await getDocs(q);
        console.log("✅ Total scans found (with orderBy):", querySnapshot.size);

        const scans = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log("📄 Scan document:", data);
          scans.push({
            id: doc.id,
            ...data,
          });
        });

        console.log("✅ Setting history data with", scans.length, "scans");
        setHistoryData(scans);
        setLoading(false);
      } catch (orderByError) {
        console.log(
          "⚠️ OrderBy failed, using client-side sorting:",
          orderByError.message
        );

        const q = query(scansRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        console.log("✅ Total scans found (without orderBy):", querySnapshot.size);

        const scans = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log("📄 Scan document:", data);
          scans.push({
            id: doc.id,
            ...data,
          });
        });

        scans.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        });

        console.log(
          "✅ Setting history data with",
          scans.length,
          "scans (sorted client-side)"
        );
        setHistoryData(scans);
        setLoading(false);
      }
    } catch (err) {
      console.error("❌ Error fetching history:", err);
      setError(`Error loading history: ${err.message}`);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useFocusEffect(
    useCallback(() => {
      console.log("🔄 History screen focused - refreshing data");
      fetchHistory();
    }, [fetchHistory])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory().then(() => setRefreshing(false));
  }, [fetchHistory]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={[styles.loadingText, { fontSize: sizes.textFontSize }]}>
          Loading history...
        </Text>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.card,
        {
          marginBottom: sizes.cardMargin,
          width: isLandscape && !isTablet ? "48%" : "100%",
        },
      ]}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={[styles.image, { height: sizes.imageHeight }]}
          onError={(e) => {
            console.log("❌ Image load error:", e.nativeEvent.error);
          }}
        />
      ) : (
        <View
          style={[
            styles.imagePlaceholder,
            { height: sizes.imageHeight },
          ]}
        >
          <Text style={[styles.placeholderText, { fontSize: sizes.textFontSize }]}>
            No Image
          </Text>
        </View>
      )}
      <View style={[styles.infoContainer, { padding: sizes.padding }]}>
        <Text
          style={[
            styles.itemTitle,
            { fontSize: sizes.titleFontSize },
          ]}
        >
          {item.biological
            ? item.biological.charAt(0).toUpperCase() +
              item.biological.slice(1)
            : "Unknown"}
        </Text>
        <Text style={[styles.itemText, { fontSize: sizes.textFontSize }]}>
          <Text style={styles.bold}>Classification:</Text>{" "}
          {item.biological || "Unknown"}
        </Text>
        {item.confidence && (
          <Text style={[styles.itemText, { fontSize: sizes.textFontSize }]}>
            <Text style={styles.bold}>Confidence:</Text>{" "}
            {(item.confidence * 100).toFixed(1)}%
          </Text>
        )}
        <Text style={[styles.itemText, { fontSize: sizes.textFontSize }]}>
          <Text style={styles.bold}>Points:</Text> {item.points || 10}
        </Text>
        <Text style={[styles.itemText, { fontSize: sizes.textFontSize }]}>
          <Text style={styles.bold}>Date:</Text> {parseTimestamp(item.timestamp)}
        </Text>
        {item.email && (
          <Text style={[styles.itemText, { fontSize: sizes.textFontSize }]}>
            <Text style={styles.bold}>Email:</Text> {item.email}
          </Text>
        )}
      </View>
    </View>
  );

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
          style={[
            styles.backButton,
            { minHeight: isTablet ? 48 : 40, paddingHorizontal: sizes.padding },
          ]}
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
          📜 History
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Error Message */}
      {error && (
        <View
          style={[
            styles.errorContainer,
            { margin: sizes.padding, padding: sizes.padding },
          ]}
        >
          <Text style={[styles.errorText, { fontSize: sizes.textFontSize }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => fetchHistory()}
            style={styles.retryButton}
          >
            <Text
              style={[styles.retryButtonText, { fontSize: sizes.textFontSize }]}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      )}

      {/* History List */}
      {historyData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.noDataText, { fontSize: sizes.titleFontSize }]}>
            📭 No scans yet
          </Text>
          <Text
            style={[styles.noDataSubtext, { fontSize: sizes.textFontSize }]}
          >
            Start scanning to see your history!
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <Text
            style={[
              styles.scanCountText,
              {
                fontSize: sizes.textFontSize,
                padding: sizes.padding,
                paddingLeft: sizes.padding * 1.33,
              },
            ]}
          >
            Total Scans: {historyData.length}
          </Text>
          <FlatList
            data={historyData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              {
                padding: sizes.padding,
                paddingBottom: sizes.padding * 2,
              },
            ]}
            numColumns={isLandscape && !isTablet ? 2 : 1}
            columnWrapperStyle={
              isLandscape && !isTablet
                ? { justifyContent: "space-between" }
                : null
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#27ae60"
              />
            }
            scrollEnabled={true}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
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
  backButtonText: {
    color: "white",
    fontWeight: "700",
  },
  headerTitle: {
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#fee",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  errorText: {
    color: "#c0392b",
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  retryButtonText: {
    color: "white",
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  noDataText: {
    textAlign: "center",
    color: "#666",
    marginBottom: 8,
    fontWeight: "600",
  },
  noDataSubtext: {
    textAlign: "center",
    color: "#999",
  },
  listContainer: {
    flex: 1,
  },
  scanCountText: {
    fontWeight: "700",
    color: "#27ae60",
    backgroundColor: "#e8f8f5",
  },
  listContent: {},
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  image: {
    width: "100%",
    backgroundColor: "#f0f0f0",
  },
  imagePlaceholder: {
    width: "100%",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#999",
  },
  infoContainer: {},
  itemTitle: {
    fontWeight: "700",
    color: "#27ae60",
    marginBottom: 8,
  },
  itemText: {
    color: "#555",
    marginBottom: 4,
    lineHeight: 18,
  },
  bold: {
    fontWeight: "700",
    color: "#2c3e50",
  },
});
