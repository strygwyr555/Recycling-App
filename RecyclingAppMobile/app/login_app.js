// FILE: app/login_app.js
// Login screen with Firebase authentication

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth } from "./firebaseInit.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

export default function LoginScreen({ navigation: navigationProp }) {
  const navigation = navigationProp ?? useNavigation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is already logged in, redirect to dashboard
        navigation.replace("Dashboard");
      }
    });

    return unsubscribe;
  }, [navigation]);

  const handleLogin = async () => {
    // Validation
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
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
      const user = userCredential.user;

      Alert.alert("Success", `Welcome back, ${user.email}!`);
      
      // Explicitly navigate to Dashboard after successful login
      navigation.replace("Dashboard");
    } catch (error) {
      console.error("Login error:", error);

      // Handle specific Firebase errors
      let errorMessage = "Login failed. Please try again.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Try again later.";
      }

      Alert.alert("Login Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword");
  };

  const handleSignUp = () => {
    navigation.navigate("Signup");
  };

  const handleBackHome = () => {
    navigation.navigate("Home");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>♻️ RecycleAI</Text>
        <Text style={styles.title}>Login to Your Account</Text>
        <Text style={styles.tip}>Join us in making the world cleaner, one item at a time!</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email or Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email or username"
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
        </View>

        {/* Forgot Password Link */}
        <Pressable onPress={handleForgotPassword} disabled={loading}>
          <Text style={styles.forgotLink}>Forgot Password?</Text>
        </Pressable>
      </View>

      {/* Login Button */}
      <Pressable
        style={[styles.button, styles.loginButton, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </Pressable>

      {/* Sign Up Section */}
      <View style={styles.signupSection}>
        <Text style={styles.signupText}>Don't have an account? </Text>
        <Pressable onPress={handleSignUp} disabled={loading}>
          <Text style={styles.signupLink}>Sign Up</Text>
        </Pressable>
      </View>

      {/* Back to Home Button */}
      <Pressable
        style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]}
        onPress={handleBackHome}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>Back to Home</Text>
      </Pressable>

      {/* LocalStorage-based login (no Firebase) */}
      <View style={styles.localStorageSection}>
        <Text style={styles.localStorageTitle}>Or login with Local Storage</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            id="email"
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            editable={!loading}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            id="password"
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#999"
            secureTextEntry
            editable={!loading}
          />
        </View>

        <Pressable
          style={[styles.button, styles.localStorageButton, loading && styles.buttonDisabled]}
          onPress={handleLocalLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login with Local Storage</Text>
          )}
        </Pressable>

        <Text style={styles.signupPrompt}>
          Don't have an account?{" "}
          <Pressable onPress={handleSignUp} disabled={loading}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </Pressable>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  logo: {
    fontSize: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 8,
    textAlign: "center",
  },
  tip: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    marginTop: 8,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  forgotLink: {
    color: "#3498db",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 8,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButton: {
    backgroundColor: "#27ae60",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  secondaryButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#3498db",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#3498db",
    fontSize: 16,
    fontWeight: "700",
  },
  signupSection: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 16,
  },
  signupText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  signupLink: {
    color: "#27ae60",
    fontSize: 14,
    fontWeight: "700",
  },
  localStorageSection: {
    marginTop: 32,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  localStorageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 16,
    textAlign: "center",
  },
  localStorageButton: {
    backgroundColor: "#2980b9",
  },
  signupPrompt: {
    marginTop: 12,
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
  },
});