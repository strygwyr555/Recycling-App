// FILE: app/dashboard.js
import { useRouter, useFocusEffect } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
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
import { auth, db } from "./firebaseInit.js";

export default function DashboardScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [itemsRecycled, setItemsRecycled] = useState(0);
  const [userName, setUserName] = useState("User");
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalScans: 0,
    totalPoints: 0,
    itemTypes: {},
  });
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
    let greetingFontSize = 24;
    let taglineFontSize = 14;
    let cardTitleFontSize = 18;
    let statNumberFontSize = 28;
    let statLabelFontSize = 12;
    let buttonFontSize = 16;
    let padding = 16;
    let cardMargin = 16;

    if (isMobileSmall) {
      greetingFontSize = 20;
      taglineFontSize = 12;
      cardTitleFontSize = 16;
      statNumberFontSize = 24;
      statLabelFontSize = 11;
      buttonFontSize = 14;
      padding = 12;
      cardMargin = 12;
    } else if (isTablet) {
      greetingFontSize = 32;
      taglineFontSize = 16;
      cardTitleFontSize = 22;
      statNumberFontSize = 36;
      statLabelFontSize = 14;
      buttonFontSize = 18;
      padding = 20;
      cardMargin = 20;
    }

    return {
      greetingFontSize,
      taglineFontSize,
      cardTitleFontSize,
      statNumberFontSize,
      statLabelFontSize,
      buttonFontSize,
      padding,
      cardMargin,
    };
  };

  const sizes = getResponsiveSizes();

  // Check authentication
  useEffect(() => {
    if (Platform.OS === "web" && typeof window === "undefined") return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setCheckingAuth(false);
        router.replace("/login_app");
        return;
      }

      setUser(currentUser);
      setCheckingAuth(false);
    });

    return unsubscribe;
  }, []);

  // Fetch user data and stats
  const fetchUserDataAndStats = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserName(userData.firstName || "User");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }

      const scansRef = collection(db, "scan");
      const q = query(scansRef, where("email", "==", currentUser.email));
      const querySnapshot = await getDocs(q);

      let totalPoints = 0;
      let itemTypes = {};

      querySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalPoints += data.points || 10;

        if (data.biological) {
          itemTypes[data.biological] = (itemTypes[data.biological] || 0) + 1;
        }
      });

      setItemsRecycled(querySnapshot.size);
      setStats({
        totalScans: querySnapshot.size,
        totalPoints,
        itemTypes,
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checkingAuth) {
      fetchUserDataAndStats();
    }
  }, [checkingAuth, fetchUserDataAndStats]);

  useFocusEffect(
    useCallback(() => {
      console.log("Dashboard focused - refreshing data");
      fetchUserDataAndStats();
    }, [fetchUserDataAndStats])
  );

  const handleStartScanning = () => router.push("/scan");
  const handleViewStatistics = () => router.push("/statistics");
  const handleViewHistory = () => router.push("/history");
  const handleViewProfile = () => router.push("/profile");

  const handleLogOut = async () => {
    try {
      await signOut(auth);
      router.replace("/login_app");
    } catch (err) {
      console.error("Error logging out:", err);
      alert("Failed to log out. Please try again.");
    }
  };

  if (checkingAuth || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { padding: sizes.padding }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { fontSize: sizes.greetingFontSize }]}>
            Welcome, {userName}
          </Text>
          <Text style={[styles.tagline, { fontSize: sizes.taglineFontSize }]}>
            Track your recycling impact and make a difference
          </Text>
        </View>

        {/* Quick Scan */}
        <View style={[styles.card, { marginBottom: sizes.cardMargin, padding: sizes.padding }]}>
          <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize }]}>
            Quick Scan
          </Text>
          <Text style={[styles.cardDescription, { fontSize: sizes.taglineFontSize }]}>
            Scan an item to check if it's recyclable and get disposal tips.
          </Text>
          <Pressable style={[styles.button, { marginTop: sizes.padding }]}>
            <Text
              style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}
              onPress={handleStartScanning}
            >
              Start Scanning
            </Text>
          </Pressable>
        </View>

        {/* Impact */}
        <View style={[styles.card, { marginBottom: sizes.cardMargin, padding: sizes.padding }]}>
          <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize }]}>
            Your Impact
          </Text>
          <View
            style={[
              styles.impactStats,
              { flexDirection: isLandscape ? "row" : "column" },
            ]}
          >
            <View style={[styles.statBox, { marginRight: isLandscape ? sizes.padding : 0 }]}>
              <Text style={[styles.statNumber, { fontSize: sizes.statNumberFontSize }]}>
                {itemsRecycled}
              </Text>
              <Text style={[styles.statLabel, { fontSize: sizes.statLabelFontSize }]}>
                Items Scanned
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { fontSize: sizes.statNumberFontSize }]}>
                {stats.totalPoints}
              </Text>
              <Text style={[styles.statLabel, { fontSize: sizes.statLabelFontSize }]}>
                Points Earned
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.button, { marginTop: sizes.padding }]}
            onPress={handleViewStatistics}
          >
            <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
              View Statistics
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, { marginTop: sizes.padding * 0.66 }]}
            onPress={handleViewHistory}
          >
            <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
              View History
            </Text>
          </Pressable>
          
          <Pressable
            style={[styles.button, { marginTop: sizes.padding * 0.66 }]}
            onPress={() => router.push("/HumanvsAIStats")}
          >
            <Text style={styles.buttonText}>View AI Comparison</Text>
          </Pressable>
        </View>

        {/* Daily Tip */}
        <View style={[styles.card, { marginBottom: sizes.cardMargin, padding: sizes.padding, backgroundColor: "#e8f8f5" }]}>
          <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize }]}>
            Eco Tip
          </Text>
          <Text style={[styles.tipText, { fontSize: sizes.taglineFontSize }]}>
            Remember to rinse containers before recycling them! This prevents contamination and
            helps keep recycling facilities clean.
          </Text>
        </View>

        {/* Profile */}
        <View style={[styles.card, { marginBottom: sizes.cardMargin, padding: sizes.padding }]}>
          <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize }]}>
            Profile
          </Text>
          <Text style={[styles.cardDescription, { fontSize: sizes.taglineFontSize }]}>
            View and manage your account information and preferences.
          </Text>
          <Pressable
            style={[styles.button, styles.profileButton, { marginTop: sizes.padding }]}
            onPress={handleViewProfile}
          >
            <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
              Go to Profile
            </Text>
          </Pressable>
        </View>

        {/* Log Out */}
        <Pressable style={[styles.button, styles.logoutButton, { marginVertical: sizes.padding }]}>
          <Text
            style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}
            onPress={handleLogOut}
          >
            Log Out
          </Text>
        </Pressable>

        <Text style={[styles.footer, { fontSize: sizes.statLabelFontSize }]}>
          v1.0.0 • RecycleAI Assistant
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollContent: { paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  header: { marginBottom: 24, paddingVertical: 12 },
  greeting: { fontWeight: "700", color: "#2c3e50", marginBottom: 4 },
  tagline: { color: "#7f8c8d" },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 3px rgba(0,0,0,0.1)" }
      : { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 }),
  },
  cardTitle: { fontWeight: "700", color: "#2c3e50", marginBottom: 8 },
  cardDescription: { color: "#555", marginBottom: 12, lineHeight: 20 },
  tipText: { color: "#27ae60", lineHeight: 20, fontWeight: "500" },
  impactStats: { justifyContent: "space-around", marginBottom: 12 },
  statBox: { alignItems: "center", flex: 1 },
  statNumber: { fontWeight: "700", color: "#27ae60", marginBottom: 4 },
  statLabel: { color: "#7f8c8d", textAlign: "center" },
  button: { backgroundColor: "#27ae60", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  buttonText: { color: "white", fontWeight: "700", textAlign: "center" },
  profileButton: { backgroundColor: "#3498db" },
  logoutButton: { backgroundColor: "#e74c3c" },
  footer: { textAlign: "center", color: "#95a5a6", marginTop: 20 },
});
