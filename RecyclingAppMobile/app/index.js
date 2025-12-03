import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>♻️</Text>
        <Text style={styles.title}>Recycling AI</Text>
        <Text style={styles.subtitle}>Making Recycling Smart & Easy</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Join our community in fighting climate change. Scan items, learn what can be recycled, and make a difference!
        </Text>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureText}>Smart Scanning</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🌍</Text>
            <Text style={styles.featureText}>Track Impact</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏆</Text>
            <Text style={styles.featureText}>Earn Rewards</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.loginButton]}
          onPress={() => router.push("/login_app")}
        >
          <Text style={styles.btnText}>Login</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.signupButton]}
          onPress={() => router.push("/signup")}
        >
          <Text style={styles.btnTextSecondary}>Sign Up</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        Together, we can build a sustainable future 🌱
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: "#f5f5f5",
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#27ae60",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
  },
  content: {
    flex: 1,
    marginBottom: 30,
  },
  description: {
    fontSize: 15,
    color: "#34495e",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center",
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButton: {
    backgroundColor: "#27ae60",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signupButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#27ae60",
  },
  btnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  btnTextSecondary: {
    color: "#27ae60",
    fontWeight: "700",
    fontSize: 16,
  },
  footer: {
    fontSize: 14,
    color: "#95a5a6",
    textAlign: "center",
    fontStyle: "italic",
  },
});
