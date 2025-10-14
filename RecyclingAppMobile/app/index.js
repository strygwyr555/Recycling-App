import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <View style={styles.logo}>
          <FontAwesome name="recycle" size={28} color="#2ecc71" />
          <Text style={styles.logoText}>RecycleAI</Text>
        </View>
        <View style={styles.navButtons}>
          <Pressable
            style={[styles.navBtn, styles.loginBtn]}
            onPress={() => alert("Login pressed")}
          >
            <Text style={styles.navBtnText}>Login</Text>
          </Pressable>
          <Pressable
            style={[styles.navBtn, styles.signupBtn]}
            onPress={() => alert("Sign Up pressed")}
          >
            <Text style={styles.navBtnText}>Sign Up</Text>
          </Pressable>
        </View>
      </View>

      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Smart Recycling Made Simple</Text>
        <Text style={styles.heroSubtitle}>
          Use AI to identify and properly recycle items. Make a difference in
          protecting our planet, one scan at a time.
        </Text>

        {/* Feature Grid */}
        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <FontAwesome name="camera" size={32} color="#27ae60" />
            <Text style={styles.featureTitle}>Instant Scanning</Text>
            <Text style={styles.featureText}>
              Quick item identification using your camera
            </Text>
          </View>

          <View style={styles.featureCard}>
            <FontAwesome name="database" size={32} color="#2980b9" />
            <Text style={styles.featureTitle}>Smart Detection</Text>
            <Text style={styles.featureText}>
              AI-powered material recognition
            </Text>
          </View>

          <View style={styles.featureCard}>
            <FontAwesome name="leaf" size={32} color="#27ae60" />
            <Text style={styles.featureTitle}>Eco Impact</Text>
            <Text style={styles.featureText}>
              Track your recycling contribution
            </Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaButtons}>
          <Pressable
            style={[styles.ctaButton, styles.primaryBtn]}
            onPress={() => alert("Get Started!")}
          >
            <Text style={styles.ctaText}>Get Started →</Text>
          </Pressable>

          <Pressable
            style={[styles.ctaButton, styles.secondaryBtn]}
            onPress={() => alert("Learn More!")}
          >
            <Text style={[styles.ctaText, { color: "#2c3e50" }]}>
              Learn More ↓
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: 80,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
  },
  navbar: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: { flexDirection: "row", alignItems: "center" },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 8,
    color: "#2c3e50",
  },
  navButtons: { flexDirection: "row" },
  navBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginLeft: 6,
  },
  navBtnText: { color: "white", fontWeight: "600" },
  loginBtn: { backgroundColor: "#3498db" },
  signupBtn: { backgroundColor: "#2ecc71" },
  hero: {
    alignItems: "center",
    textAlign: "center",
    marginTop: 30,
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 12,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 30,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 30,
  },
  featureCard: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    margin: 8,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
    color: "#2c3e50",
  },
  featureText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginTop: 4,
  },
  ctaButtons: { flexDirection: "row", marginTop: 20 },
  ctaButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  primaryBtn: { backgroundColor: "#27ae60" },
  secondaryBtn: {
    backgroundColor: "#ecf0f1",
    borderWidth: 1,
    borderColor: "#bdc3c7",
  },
  ctaText: { fontSize: 16, fontWeight: "600", color: "white" },
});
