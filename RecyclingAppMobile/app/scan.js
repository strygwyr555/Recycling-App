// FILE: app/scan.js
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { auth, db } from "./firebaseInit";
import { classifyImage } from "./mlClassifier";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [successData, setSuccessData] = useState(null); // Store success data

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  const handleScan = async () => {
    if (!cameraRef) {
      console.warn("Camera ref not ready");
      return;
    }
    try {
      setScanning(true);
      console.log("Taking photo...");
      const photo = await cameraRef.takePictureAsync({ quality: 0.7 });
      console.log("Photo captured:", photo.uri);
      await processImage(photo.uri);
    } catch (err) {
      console.error("Camera scan error:", err);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
      setScanning(false);
      setClassifying(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setScanning(true);
      console.log("Opening image picker...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled) {
        console.log("Image selected:", result.assets[0].uri);
        await processImage(result.assets[0].uri);
      } else {
        console.log("Image picker cancelled");
        setScanning(false);
      }
    } catch (err) {
      console.error("Gallery pick error:", err);
      Alert.alert("Error", "Failed to pick image. Please try again.");
      setScanning(false);
      setClassifying(false);
    }
  };

  const processImage = async (uri) => {
    try {
      setClassifying(true);
      console.log("Processing image:", uri);

      // Step 1: Run ML classification
      console.log("Starting ML classification...");
      const classificationResult = await classifyImage(uri);
      console.log("Classification result:", classificationResult);

      if (classificationResult.error) {
        Alert.alert("Classification Error", classificationResult.error);
        setScanning(false);
        setClassifying(false);
        return;
      }

      // Step 2: Upload image to Cloudinary
      console.log("Uploading to Cloudinary...");
      const imageUrl = await uploadToCloudinary(uri);
      if (!imageUrl) throw new Error("Image upload failed.");
      console.log("Image uploaded:", imageUrl);

      // Step 3: Save to Firestore with classification
      console.log("Saving to Firestore...");
      await saveToFirestore(imageUrl, classificationResult);
      console.log("Saved to Firestore successfully");

      // Step 4: Show success screen (custom UI instead of Alert)
      setSuccessData({
        classification: classificationResult.classification,
        instruction: classificationResult.disposalInfo.instruction,
        confidence: classificationResult.confidence,
      });
      setScanning(false);
      setClassifying(false);
    } catch (err) {
      console.error("Processing error:", err);
      Alert.alert("Error", err.message || "Failed to process scan. Please try again.");
      setScanning(false);
      setClassifying(false);
    }
  };

  const saveToFirestore = async (imageUrl, classificationResult) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in.");

      const docData = {
        biological: classificationResult.classification,
        email: user.email,
        userId: user.uid,
        imageUrl: imageUrl,
        timestamp: new Date().toISOString(),
        confidence: classificationResult.confidence,
        disposalInstruction: classificationResult.disposalInfo.instruction,
        allClassifications: classificationResult.allResults,
        points: 10,
      };

      console.log("Saving document:", docData);
      await addDoc(collection(db, "scan"), docData);
    } catch (err) {
      console.error("Firestore save error:", err);
      throw err;
    }
  };

  const uploadToCloudinary = async (uri) => {
    try {
      const base64 = await toBase64(uri);
      const cloudName = "dtmpkhm3z";
      const uploadPreset = "recycleApp";

      const formData = new FormData();
      formData.append("file", base64);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.secure_url || null;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      throw new Error("Failed to upload image to cloud storage");
    }
  };

  const toBase64 = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  // SUCCESS SCREEN
  if (successData) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCard}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Scan Successful!</Text>
          
          <View style={styles.successContent}>
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Item Detected:</Text>
              <Text style={styles.resultValue}>{successData.classification.toUpperCase()}</Text>
            </View>

            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Disposal Instructions:</Text>
              <Text style={styles.resultValue}>{successData.instruction}</Text>
            </View>

            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Confidence:</Text>
              <Text style={styles.resultValue}>{successData.confidence.toFixed(0)}%</Text>
            </View>

            <View style={styles.pointsBox}>
              <Text style={styles.pointsText}>🏆 +10 Points Earned</Text>
            </View>
          </View>

          <Pressable
            style={styles.dashboardButton}
            onPress={() => {
              console.log("Navigating to dashboard");
              setSuccessData(null);
              router.push("/dashboard");
            }}
          >
            <Text style={styles.dashboardButtonText}>Back to Dashboard</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={setCameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          {classifying && (
            <View style={styles.classifyingOverlay}>
              <ActivityIndicator size="large" color="#27ae60" />
              <Text style={styles.classifyingText}>Analyzing item...</Text>
            </View>
          )}

          <Pressable
            style={[styles.button, (scanning || classifying) && styles.buttonDisabled]}
            onPress={handleScan}
            disabled={scanning || classifying}
          >
            <Text style={styles.buttonText}>
              {classifying ? "Analyzing..." : scanning ? "Scanning..." : "Capture Scan"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, { backgroundColor: "#555" }]}
            onPress={handlePickImage}
            disabled={scanning || classifying}
          >
            <Text style={styles.buttonText}>Pick From Gallery</Text>
          </Pressable>

          <Pressable
            style={[styles.button, { backgroundColor: "#888" }]}
            onPress={() => router.back()}
            disabled={scanning || classifying}
          >
            <Text style={styles.buttonText}>Back</Text>
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  camera: { flex: 1, width: "100%" },
  overlay: { flex: 1, backgroundColor: "transparent", justifyContent: "flex-end", padding: 20, paddingBottom: 30 },
  classifyingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  classifyingText: { color: "#fff", fontSize: 16, marginTop: 12, fontWeight: "600" },
  text: { color: "#fff", fontSize: 16, marginBottom: 20, textAlign: "center" },
  button: { backgroundColor: "#27ae60", paddingVertical: 12, borderRadius: 8, marginBottom: 12 },
  buttonDisabled: { backgroundColor: "#95a5a6", opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },

  // SUCCESS SCREEN STYLES
  successContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#27ae60",
    marginBottom: 20,
    textAlign: "center",
  },
  successContent: {
    width: "100%",
    marginBottom: 20,
  },
  resultBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60",
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7f8c8d",
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
  },
  pointsBox: {
    backgroundColor: "#e8f8f5",
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#27ae60",
  },
  pointsText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27ae60",
    textAlign: "center",
  },
  dashboardButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  dashboardButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
