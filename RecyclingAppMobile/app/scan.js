// FILE: app/scan.js
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { auth, db } from "./firebaseInit";

const AI_API_URL = "https://hypernutritive-marley-untheoretically.ngrok-free.dev/predict";
const CLOUDINARY_CLOUD = "dtmpkhm3z";
const UPLOAD_PRESET = "recycleApp";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  // Capture full photo — no cropping
  const handleScan = async () => {
    if (!cameraRef) return;
    try {
      setScanning(true);
      const photo = await cameraRef.takePictureAsync({ quality: 0.8, skipProcessing: true });
      await processPreview(photo.uri);
    } catch (err) {
      console.error("Camera scan error:", err);
    } finally {
      setScanning(false);
    }
  };

  const handlePickImage = async () => {
  try {
    // ✅ Request permission before opening the gallery
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access gallery is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await processPreview(result.assets[0].uri);
    }
  } catch (err) {
    console.error("Gallery pick error:", err);
  }
};


  const processPreview = async (uri) => {
    setScanning(true);
    try {
      setPreviewUri(uri);
      const result = await classifyImageAI(uri);
      setAiResult(result);
    } catch (err) {
      console.error("AI classification error:", err);
      setPreviewUri(null);
      setAiResult(null);
    } finally {
      setScanning(false);
    }
  };

  const saveScan = async () => {
    if (!previewUri || !aiResult) return;
    try {
      setScanning(true);
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in.");
      const imageUrl = await uploadToCloudinary(previewUri);
      await addDoc(collection(db, "scans"), {
        classification: aiResult.predicted_class,
        confidence: aiResult.confidence,
        bin: aiResult.bin,
        suggestion: aiResult.suggestion,
        email: user.email,
        imageUrl,
        timestamp: new Date().toISOString(),
      });
      router.back();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setScanning(false);
    }
  };

  const cancelPreview = () => {
    setPreviewUri(null);
    setAiResult(null);
  };

  const uploadToCloudinary = async (uri) => {
    try {
      const base64 = await toBase64(uri);
      const formData = new FormData();
      formData.append("file", base64);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      return data.secure_url || null;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      return null;
    }
  };

  const classifyImageAI = async (uri) => {
    try {
      const formData = new FormData();
      formData.append("file", { uri, type: "image/jpeg", name: "scan.jpg" });
      const res = await fetch(AI_API_URL, { method: "POST", body: formData });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("AI error:", err);
      return {
        predicted_class: "Unknown",
        confidence: 0,
        bin: "Unknown",
        suggestion: "No suggestion.",
      };
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

  if (!permission)
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );

  if (!permission.granted)
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );

  if (previewUri && aiResult)
    return (
      <ScrollView contentContainerStyle={styles.previewContainer}>
        <Image source={{ uri: previewUri }} style={styles.previewImage} />
        <Text style={styles.resultText}>🧠 Predicted: {aiResult.predicted_class}</Text>
        <Text style={styles.resultText}>Confidence: {(aiResult.confidence * 100).toFixed(2)}%</Text>
        <Text style={styles.resultText}>📦 Bin: {aiResult.bin}</Text>
        <Text style={styles.suggestionText}>💡 Tip: {aiResult.suggestion}</Text>
        <Pressable style={styles.button} onPress={saveScan}>
          <Text style={styles.buttonText}>Save Scan</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: "#888" }]} onPress={cancelPreview}>
          <Text style={styles.buttonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    );

  return (
    <View style={styles.container}>
      <CameraView ref={setCameraRef} style={styles.camera} facing="back" />
      {/* Buttons only */}
      <View style={[styles.overlay, { marginBottom: 40 }]}>
        <Pressable style={styles.button} onPress={handleScan} disabled={scanning}>
          <Text style={styles.buttonText}>{scanning ? "Scanning..." : "Capture Scan"}</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: "#555" }]} onPress={handlePickImage}>
          <Text style={styles.buttonText}>Pick From Gallery</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: "#888" }]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1, width: "100%" },
  overlay: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },
  button: { backgroundColor: "#27ae60", paddingVertical: 12, borderRadius: 8, marginBottom: 12, width: 220 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },
  text: { color: "#fff", fontSize: 16, marginBottom: 20, textAlign: "center" },
  previewContainer: { flexGrow: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center", padding: 20 },
  previewImage: { width: 250, height: 250, borderRadius: 12, marginBottom: 20 },
  resultText: { color: "#fff", fontSize: 18, marginBottom: 8 },
  suggestionText: { color: "#27ae60", fontSize: 16, marginBottom: 12, textAlign: "center" },
});
