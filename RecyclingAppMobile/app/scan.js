// FILE: app/scan.js
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { auth } from "./firebaseInit";
import { ensembleClassify } from "./utils/ensembleClassifier";

const AI_API_URL = "https://hypernutritive-marley-untheoretically.ngrok-free.dev/predict";
const CLOUDINARY_CLOUD = "dtmpkhm3z";
const UPLOAD_PRESET = "recycleApp";

// NEW: 12-class system matching Flask
const LABEL_MAP = {
  "metal waste": "metal_waste",
  "organic waste": "organic_waste",
  "paper waste": "paper_waste",
  "plastic waste": "plastic_waste",
  "battery waste": "battery_waste",

  "white-glass": "white_glass",
  "green-glass": "green_glass",
  "brown-glass": "brown_glass",

  "cardboard waste": "cardboard_waste",
  "clothing waste": "clothing_waste",

  "E-waste": "e_waste",
  "trash": "trash",
};

const TRASH_CLASSIFICATIONS = [
  { id: "metal_waste", label: "Metal Waste", color: "#95a5a6" },
  { id: "organic_waste", label: "Organic Waste", color: "#8b4513" },
  { id: "paper_waste", label: "Paper Waste", color: "#e67e22" },
  { id: "plastic_waste", label: "Plastic Waste", color: "#3498db" },
  { id: "battery_waste", label: "Battery Waste", color: "#f39c12" },

  { id: "white_glass", label: "White Glass", color: "#ecf0f1" },
  { id: "green_glass", label: "Green Glass", color: "#2ecc71" },
  { id: "brown_glass", label: "Brown Glass", color: "#d35400" },

  { id: "cardboard_waste", label: "Cardboard Waste", color: "#d68910" },
  { id: "clothing_waste", label: "Clothing Waste", color: "#c0392b" },

  { id: "e_waste", label: "E-waste", color: "#2c3e50" },

  { id: "trash", label: "Trash", color: "#7f8c8d" },
];

export default function ScanScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);
  const [aiModel1Result, setAiModel1Result] = useState(null);
  const [aiModel2Result, setAiModel2Result] = useState(null);
  const [selectedClassification, setSelectedClassification] = useState(null);
  const [showClassificationScreen, setShowClassificationScreen] = useState(false);
  const [cloudinaryUrl, setCloudinaryUrl] = useState(null);

  const [orientation, setOrientation] = useState(
    width > height ? "landscape" : "portrait"
  );

  useEffect(() => {
    const isLandscape = width > height;
    setOrientation(isLandscape ? "landscape" : "portrait");
  }, [width, height]);

  const isMobileSmall = width < 375;
  const isTablet = width >= 768;

  const getResponsiveSizes = () => {
    let titleFontSize = 18;
    let textFontSize = 14;
    let buttonFontSize = 16;
    let imageHeight = 280;
    let padding = 20;

    if (isMobileSmall) {
      titleFontSize = 16;
      textFontSize = 12;
      buttonFontSize = 14;
      imageHeight = 220;
      padding = 16;
    } else if (isTablet) {
      titleFontSize = 22;
      textFontSize = 16;
      buttonFontSize = 18;
      imageHeight = 380;
      padding = 24;
    }

    return { titleFontSize, textFontSize, buttonFontSize, imageHeight, padding };
  };

  const sizes = getResponsiveSizes();

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  // CAPTURE PHOTO
  const handleScan = async () => {
    if (!cameraRef) return;
    try {
      setScanning(true);
      const photo = await cameraRef.takePictureAsync({ quality: 0.8 });
      await processPreview(photo.uri);
    } catch (err) {
      alert("Failed to capture image.");
      setScanning(false);
    }
  };

  // PICK FROM GALLERY
  const handlePickImage = async () => {
    try {
      setScanning(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled) {
        await processPreview(result.assets[0].uri);
      } else {
        setScanning(false);
      }
    } catch (err) {
      alert("Failed to pick image.");
      setScanning(false);
    }
  };

  // PROCESS IMAGE (UPLOAD + CLASSIFY)
  const processPreview = async (uri) => {
    try {
      setScanning(true);

      const imageUrl = await uploadToCloudinary(uri);
      if (!imageUrl) throw new Error("Upload failed");

      setCloudinaryUrl(imageUrl);

      const dualPredictions = await classifyImageAIDual(uri);

      setAiModel1Result(dualPredictions.model1);
      setAiModel2Result(dualPredictions.model2);

      setPreviewUri(uri);
      setShowClassificationScreen(true);
      setScanning(false);
    } catch (err) {
      alert("Processing failed.");
      setScanning(false);
    }
  };

  const handleClassificationSelect = (classificationId) => {
    setSelectedClassification(classificationId);
  };

  const handleConfirmAndContinue = () => {
    if (!selectedClassification) {
      alert("Please select a category");
      return;
    }

    const ensembleResult = ensembleClassify({
      model1: aiModel1Result,
      model2: aiModel2Result,
      human: selectedClassification,
    });

    router.push({
      pathname: "/final",
      params: {
        imageUrl: cloudinaryUrl,
        previewUri,
        userSelection: selectedClassification,
        ensembleResult: JSON.stringify(ensembleResult),
      },
    });
  };

  const cancelPreview = () => {
    setPreviewUri(null);
    setAiModel1Result(null);
    setAiModel2Result(null);
    setSelectedClassification(null);
    setShowClassificationScreen(false);
  };

  // CLOUDINARY
  const uploadToCloudinary = async (uri) => {
    try {
      const base64 = await toBase64(uri);
      const formData = new FormData();
      formData.append("file", base64);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        { method: "POST", body: formData }
      );

      const data = await res.json();
      return data.secure_url || null;
    } catch (err) {
      return null;
    }
  };

  // ML CLASSIFICATION
  const classifyImageAIDual = async (uri) => {
    const base64 = await toBase64(uri);

    const res = await fetch(AI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
    });

    const data = await res.json();

    return {
      model1: {
        prediction: LABEL_MAP[data.mobilenet.prediction] || "unknown",
        confidence: data.mobilenet.confidence,
      },
      model2: {
        prediction: LABEL_MAP[data.rexnet.prediction] || "unknown",
        confidence: data.rexnet.confidence,
      },
    };
  };

  const toBase64 = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  // CLASSIFICATION SCREEN
  if (showClassificationScreen && previewUri) {
    return (
      <SafeAreaView style={styles.previewContainer}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Image source={{ uri: previewUri }} style={styles.previewImage} />

          <Text style={styles.classificationTitle}>
            Select the correct trash type
          </Text>

          <View style={{ marginBottom: 20 }}>
            {TRASH_CLASSIFICATIONS.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.classificationButton,
                  selectedClassification === item.id &&
                  styles.classificationButtonSelected,
                ]}
                onPress={() => handleClassificationSelect(item.id)}
              >
                <Text style={styles.classificationLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ alignItems: "center", width: "100%", marginTop: 10 }}>

            <Pressable
              style={[
                styles.button,
                { backgroundColor: "#27ae60", width: 220 },
                !selectedClassification && styles.buttonDisabled,
              ]}
              disabled={!selectedClassification}
              onPress={handleConfirmAndContinue}
            >
              <Text style={styles.buttonText}>View Recommendation</Text>
            </Pressable>

            <Pressable
              style={[
                styles.button,
                { backgroundColor: "#c0392b", width: 220 },
              ]}
              onPress={cancelPreview}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>

          </View>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // CAMERA SCREEN (UI RESTORED EXACTLY)
  return (
    <View style={styles.container}>
      <CameraView ref={setCameraRef} style={styles.camera} facing="back" />

      <View style={styles.overlay}>
        {/* Capture Scan Button */}
        <Pressable
          style={[styles.button, scanning && styles.buttonDisabled]}
          onPress={handleScan}
          disabled={scanning}
        >
          <Text style={styles.buttonText}>
            {scanning ? "Processing..." : "Capture Scan"}
          </Text>
        </Pressable>

        {/* Pick from Gallery */}
        <Pressable
          style={[styles.button, { backgroundColor: "#555" }]}
          onPress={handlePickImage}
          disabled={scanning}
        >
          <Text style={styles.buttonText}>Pick from Gallery</Text>
        </Pressable>

        {/* Back Button */}
        <Pressable
          style={[styles.button, { backgroundColor: "#888" }]}
          onPress={() => router.push("/dashboard")}
          disabled={scanning}
        >
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

// STYLES (Unchanged UI)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: { flex: 1, width: "100%" },
  overlay: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#27ae60",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    width: 220,
  },
  buttonDisabled: { backgroundColor: "#95a5a6", opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  previewContainer: { flex: 1, backgroundColor: "#fff" },
  previewImage: {
    width: "100%",
    height: 280,
    borderRadius: 12,
    marginBottom: 20,
  },
  classificationTitle: {
    color: "#333",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  classificationButton: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  classificationButtonSelected: {
    backgroundColor: "#e8f8f5",
    borderColor: "#27ae60",
  },
  classificationLabel: {
    color: "#333",
    fontWeight: "600",
  },
});

