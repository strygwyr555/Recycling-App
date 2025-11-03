// FILE: app/scan.js
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { auth, db } from "./firebaseInit";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  const handleScan = async () => {
    if (!cameraRef) return;
    try {
      setScanning(true);
      const photo = await cameraRef.takePictureAsync({ quality: 0.7 });
      await saveToFirestore(photo.uri);
    } catch (err) {
      console.error("Camera scan error:", err);
      alert("Failed to capture scan.");
    } finally {
      setScanning(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled) {
        await saveToFirestore(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Gallery pick error:", err);
      alert("Failed to pick image.");
    }
  };

  const saveToFirestore = async (uri) => {
    try {
      setScanning(true);
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in.");

      const imageUrl = await uploadToCloudinary(uri);
      if (!imageUrl) throw new Error("Image upload failed.");

      await addDoc(collection(db, "scans"), {
        classification: "biological", // or "Unknown" if you’ll classify later
        email: user.email,
        imageUrl: imageUrl,
        timestamp: new Date().toISOString(),
      });

      alert("Scan saved successfully!");
      router.back();
    } catch (err) {
      console.error("Firestore save error:", err);
      alert("Failed to save scan.");
    } finally {
      setScanning(false);
    }
  };

  const uploadToCloudinary = async (uri) => {
    try {
      const base64 = await toBase64(uri);
      const cloudName = "dtmpkhm3z"; // your Cloudinary cloud name
      const uploadPreset = "recycleApp"; // must exist in your Cloudinary settings

      const formData = new FormData();
      formData.append("file", base64);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      return data.secure_url || null;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      return null;
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
          <Pressable
            style={[styles.button, scanning && styles.buttonDisabled]}
            onPress={handleScan}
            disabled={scanning}
          >
            <Text style={styles.buttonText}>{scanning ? "Scanning..." : "Capture Scan"}</Text>
          </Pressable>

          <Pressable
            style={[styles.button, { backgroundColor: "#555" }]}
            onPress={handlePickImage}
            disabled={scanning}
          >
            <Text style={styles.buttonText}>Pick From Gallery</Text>
          </Pressable>

          <Pressable
            style={[styles.button, { backgroundColor: "#888" }]}
            onPress={() => router.back()}
            disabled={scanning}
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
  overlay: { flex: 1, backgroundColor: "transparent", justifyContent: "flex-end", padding: 20 },
  text: { color: "#fff", fontSize: 16, marginBottom: 20, textAlign: "center" },
  button: { backgroundColor: "#27ae60", paddingVertical: 12, borderRadius: 8, marginBottom: 12 },
  buttonDisabled: { backgroundColor: "#95a5a6" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },
});
