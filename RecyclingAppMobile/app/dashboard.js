// FILE: app/dashboard.js
// Main dashboard screen for authenticated users with quick actions and impact tracking

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { auth, db } from './firebaseInit.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Dashboard guard: require local user (no Firebase)
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

const user = getCurrentUser();
if (!user) {
  window.location.href = "login.html";
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [itemsRecycled, setItemsRecycled] = useState(0);
  const [userName, setUserName] = useState("User");

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Load user profile data
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

        // Load scan history count
        try {
          const scansCol = collection(db, "scans");
          const q = query(scansCol, where("uid", "==", currentUser.uid));
          const snap = await getDocs(q);
          setItemsRecycled(snap.size);
        } catch (err) {
          console.error("Error loading scan history:", err);
        }

        setLoading(false);
      } else {
        // Not logged in - redirect to login
        navigation.replace("Login");
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        // Reload scan count
        const reloadScans = async () => {
          try {
            const scansCol = collection(db, "scans");
            const q = query(scansCol, where("uid", "==", user.uid));
            const snap = await getDocs(q);
            setItemsRecycled(snap.size);
          } catch (err) {
            console.error("Error reloading scan history:", err);
          }
        };
        reloadScans();
      }
    }, [user])
  );

  const handleStartScanning = () => {
    navigation.navigate("Scanner");
  };

  const handleViewHistory = () => {
    navigation.navigate("History");
  };

  const handleViewProfile = () => {
    navigation.navigate("Profile");
  };

  const handleLogOut = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (err) {
      console.error("Error logging out:", err);
      alert("Failed to log out. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {userName}! 🌱</Text>
        <Text style={styles.tagline}>Making the world cleaner, one scan at a time</Text>
      </View>

      {/* Quick Scan Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📸 Quick Scan</Text>
        <Text style={styles.cardDescription}>Scan an item to check if it's recyclable and get disposal tips.</Text>
        <Pressable style={styles.button} onPress={handleStartScanning}>
          <Text style={styles.buttonText}>Start Scanning</Text>
        </Pressable>
      </View>

      {/* Impact Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>♻️ Your Impact</Text>
        <View style={styles.impactStats}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{itemsRecycled}</Text>
            <Text style={styles.statLabel}>Items Scanned</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{Math.round(itemsRecycled * 0.5)}</Text>
            <Text style={styles.statLabel}>Points Earned</Text>
          </View>
        </View>
        <Pressable style={[styles.button, { marginTop: 12 }]} onPress={handleViewHistory}>
          <Text style={styles.buttonText}>View History</Text>
        </Pressable>
      </View>

      {/* Daily Tip Card */}
      <View style={[styles.card, { backgroundColor: "#e8f8f5" }]}>
        <Text style={styles.cardTitle}>💡 Daily Eco Tip</Text>
        <Text style={styles.tipText}>
          Remember to rinse containers before recycling them! This prevents contamination and helps keep recycling facilities clean.
        </Text>
      </View>

      {/* Profile Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Profile</Text>
        <Text style={styles.cardDescription}>View and manage your account information and preferences.</Text>
        <Pressable style={[styles.button, { backgroundColor: "#3498db" }]} onPress={handleViewProfile}>
          <Text style={styles.buttonText}>Go to Profile</Text>
        </Pressable>
      </View>

      {/* Log Out Button */}
      <Pressable
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogOut}
      >
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>

      {/* Footer */}
      <Text style={styles.footer}>v1.0.0 • RecycleAI Assistant</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    marginBottom: 24,
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: "#2c3e50",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#555",
    marginBottom: 12,
    lineHeight: 20,
  },
  tipText: {
    fontSize: 14,
    color: "#27ae60",
    lineHeight: 20,
    fontWeight: "500",
  },
  impactStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#27ae60",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#27ae60",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: "#e74c3c",
    marginTop: 20,
  },
  footer: {
    textAlign: "center",
    color: "#95a5a6",
    fontSize: 12,
    marginTop: 20,
  },
});