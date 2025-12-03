import { useRouter } from "expo-router";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth } from "./firebaseInit";

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false); // ✅ Added to track router readiness

  // Wait for router to mount before handling redirects
  useEffect(() => {
    const timeout = setTimeout(() => setIsReady(true), 500); // small delay to ensure layout is ready

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && isReady) {
        router.push("/dashboard");
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [isReady]);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        identifier,
        password
      );
      const user = userCredential.user;
      Alert.alert("Success", `Welcome back, ${user.email}!`);

      // ✅ Add small delay to avoid "navigate before mounting" bug
      setTimeout(() => {
        router.push("/dashboard");
      }, 100);
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login failed. Please try again.";

      if (error.code === "auth/user-not-found") errorMessage = "No account found with this email.";
      else if (error.code === "auth/wrong-password") errorMessage = "Incorrect password.";
      else if (error.code === "auth/invalid-email") errorMessage = "Invalid email address.";
      else if (error.code === "auth/too-many-requests") errorMessage = "Too many failed login attempts. Try again later.";

      Alert.alert("Login Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>♻️ Recycle AI</Text>
        <Text style={styles.title}>Login to Your Account</Text>
        <Text style={styles.tip}>
          Join us in making the world cleaner, one item at a time!
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={identifier}
            onChangeText={setIdentifier}
            editable={!loading}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry
          />
        </View>
      </View>

      <Pressable
        style={[styles.button, styles.loginButton, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </Pressable>

      <Pressable
        style={styles.linkButton}
        onPress={() => router.push("/signup")}
        disabled={loading}
      >
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </Pressable>

      <Pressable
        style={styles.linkButton}
        onPress={() => router.push("/")}
        disabled={loading}
      >
        <Text style={styles.linkText}>Back to Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#f5f5f5" },
  header: { marginBottom: 30, alignItems: "center" },
  logo: { fontSize: 40, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  tip: { fontSize: 14, color: "#7f8c8d", textAlign: "center", marginTop: 8 },
  form: { marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16 },
  button: { paddingVertical: 14, borderRadius: 8, marginVertical: 10, alignItems: "center" },
  loginButton: { backgroundColor: "#27ae60" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
  linkButton: { marginTop: 10, alignItems: "center" },
  linkText: { color: "#3498db", fontSize: 14 },
});
