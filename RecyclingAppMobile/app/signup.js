import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { auth, db } from "./firebaseInit";

export default function SignupScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const { firstName, lastName, email, password } = formData;
    if (!firstName || !lastName || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), { firstName, lastName, email, createdAt: new Date().toISOString() });
      Alert.alert("Success", `Welcome, ${firstName}!`);
      router.replace("/dashboard");
    } catch (err) {
      console.error("Signup error:", err);
      Alert.alert("Error", err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput placeholder="First Name" style={styles.input} value={formData.firstName} onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))} editable={!loading} />
      <TextInput placeholder="Last Name" style={styles.input} value={formData.lastName} onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))} editable={!loading} />
      <TextInput placeholder="Email" style={styles.input} value={formData.email} onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))} editable={!loading} autoCapitalize="none" keyboardType="email-address" />
      <TextInput placeholder="Password" style={styles.input} value={formData.password} onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))} editable={!loading} secureTextEntry />

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </Pressable>

      <Pressable style={styles.linkButton} onPress={() => router.push("/login_app")} disabled={loading}>
        <Text style={styles.linkText}>Already have an account? Log In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#f5f5f5" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  input: { backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: "#27ae60", paddingVertical: 12, borderRadius: 8, marginTop: 8, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "700", textAlign: "center", fontSize: 16 },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#3498db", fontSize: 14 },
});
