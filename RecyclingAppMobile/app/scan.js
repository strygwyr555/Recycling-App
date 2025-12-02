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

const TRASH_CLASSIFICATIONS = [
  { id: "plastic", label: "Plastic Waste", color: "#3498db" },
  { id: "metal", label: "Metal Waste", color: "#95a5a6" },
  { id: "paper", label: "Paper Waste", color: "#e67e22" },
  { id: "battery", label: "Battery Waste", color: "#f39c12" },
  { id: "glass", label: "Glass Waste", color: "#27ae60" },
  { id: "automobile", label: "Automobile Wastes", color: "#c0392b" },
  { id: "organic", label: "Organic Waste", color: "#8b4513" },
  { id: "ewaste", label: "E-waste", color: "#2c3e50" },
  { id: "lightbulb", label: "Light Bulbs", color: "#f1c40f" },
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

  // Track orientation changes
  useEffect(() => {
    const isLandscape = width > height;
    setOrientation(isLandscape ? "landscape" : "portrait");
  }, [width, height]);

  // Responsive values
  const isLandscape = orientation === "landscape";
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

    if (isLandscape && !isTablet) {
      imageHeight = height * 0.5;
    }

    return {
      titleFontSize,
      textFontSize,
      buttonFontSize,
      imageHeight,
      padding,
    };
  };

  const sizes = getResponsiveSizes();

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  // Capture photo from camera
  const handleScan = async () => {
    if (!cameraRef) return;
    try {
      setScanning(true);
      const photo = await cameraRef.takePictureAsync({ quality: 0.8 });
      await processPreview(photo.uri);
    } catch (err) {
      console.error("Camera capture error:", err);
      alert("Failed to capture image. Please try again.");
      setScanning(false);
    }
  };

  // Pick image from gallery
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
      console.error("Gallery pick error:", err);
      alert("Failed to pick image. Please try again.");
      setScanning(false);
    }
  };

  // Process image: upload to Cloudinary → classify with ML → show classification screen
  const processPreview = async (uri) => {
    try {
      setScanning(true);

      // Step 1: Upload image to Cloudinary
      const imageUrl = await uploadToCloudinary(uri);
      if (!imageUrl) throw new Error("Image upload failed");
      setCloudinaryUrl(imageUrl);

      // Step 2: Get BOTH AI model predictions in parallel
      console.log("📊 Getting dual AI predictions...");
      const dualPredictions = await classifyImageAIDual(uri);
      if (!dualPredictions) throw new Error("Classification failed");

      console.log("✅ AI Model 1:", dualPredictions.model1);
      console.log("✅ AI Model 2:", dualPredictions.model2);

      // Step 3: Show classification selection screen
      setPreviewUri(uri);
      setAiModel1Result(dualPredictions.model1);
      setAiModel2Result(dualPredictions.model2);
      setShowClassificationScreen(true);
      setScanning(false);
    } catch (err) {
      console.error("Preview processing error:", err);
      alert("Failed to process image. Please try again.");
      setScanning(false);
    }
  };

  // Handle user classification selection
  const handleClassificationSelect = (classificationId) => {
    console.log("User selected:", classificationId);
    setSelectedClassification(classificationId);
  };

  // Confirm selection and navigate to final classification page
  const handleConfirmAndContinue = async () => {
    try {
      if (!selectedClassification) {
        alert("Please select a trash type");
        return;
      }

      console.log("🔄 Running ensemble algorithm...");
      setScanning(true);

      // Step 1: Run ensemble classifier with dual models + human selection
      const ensembleResult = ensembleClassify({
        model1: aiModel1Result,
        model2: aiModel2Result,
        human: selectedClassification,
      });

      console.log("📊 Ensemble Result:", ensembleResult);

      // Step 2: Navigate to final classification page
      router.push({
        pathname: "/final",
        params: {
          imageUrl: cloudinaryUrl,
          previewUri: previewUri,
          userSelection: selectedClassification,
          ensembleResult: JSON.stringify(ensembleResult),
        },
      });

      setScanning(false);
    } catch (err) {
      console.error("Error confirming selection:", err);
      alert("Failed to process. Please try again.");
      setScanning(false);
    }
  };

  // Cancel and return to camera
  const cancelPreview = () => {
    console.log("User cancelled");
    setPreviewUri(null);
    setAiModel1Result(null);
    setAiModel2Result(null);
    setSelectedClassification(null);
    setCloudinaryUrl(null);
    setShowClassificationScreen(false);
    setScanning(false);
  };

  // Upload image to Cloudinary
  const uploadToCloudinary = async (uri) => {
    try {
      const base64 = await toBase64(uri);
      const formData = new FormData();
      formData.append("file", base64);
      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        { method: "POST", body: formData }
      );

      const data = await response.json();
      console.log("☁️ Cloudinary upload successful:", data.secure_url);
      return data.secure_url || null;
    } catch (err) {
      console.error("❌ Cloudinary upload error:", err);
      return null;
    }
  };

  // Classify image using dual ML models
  const classifyImageAIDual = async (uri) => {
    try {
      const base64 = await toBase64(uri);

      const response = await fetch(AI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      // ===== HANDLE NEW DUAL-MODEL FORMAT =====
      // Data format: { mobilenet: {...}, rexnet: {...} }
      return {
        model1: {
          prediction: data.mobilenet?.prediction || data.model1?.prediction || "Unknown",
          confidence: parseFloat(data.mobilenet?.confidence || data.model1?.confidence || 0),
        },
        model2: {
          prediction: data.rexnet?.prediction || data.model2?.prediction || "Unknown",
          confidence: parseFloat(data.rexnet?.confidence || data.model2?.confidence || 0),
        },
      };
    } catch (err) {
      console.error("❌ ML classification error:", err);
      console.log("⚠️ Falling back to single model or error state");
      
      // Graceful degradation: return error object
      return null;
    }
  };

  // Convert image to Base64
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
        <Text style={[styles.text, { fontSize: sizes.textFontSize }]}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={[styles.text, { fontSize: sizes.textFontSize }]}>
          Camera access is required to scan items
        </Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
            Grant Permission
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Classification Selection Screen
  if (showClassificationScreen && previewUri) {
    return (
      <SafeAreaView style={styles.previewContainer}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { padding: sizes.padding, paddingBottom: sizes.padding * 2 },
          ]}
        >
          {/* Image Preview */}
          <Image
            source={{ uri: previewUri }}
            style={[styles.previewImage, { height: sizes.imageHeight }]}
          />

          {/* Title */}
          <Text
            style={[
              styles.classificationTitle,
              { fontSize: sizes.titleFontSize, marginBottom: sizes.padding },
            ]}
          >
            Select the correct trash material type
          </Text>

          {/* AI Predictions Summary (Read-only) */}
          {aiModel1Result && aiModel2Result && (
            <View style={[styles.aiSummaryBox, { marginBottom: sizes.padding }]}>
              <Text style={[styles.aiSummaryTitle, { fontSize: sizes.textFontSize * 0.9 }]}>
                🤖 AI Suggestions:
              </Text>
              <View style={styles.aiSummaryRow}>
                <Text style={styles.aiSummaryLabel}>Model 1:</Text>
                <Text style={styles.aiSummaryPred}>
                  {aiModel1Result.prediction} ({(aiModel1Result.confidence * 100).toFixed(0)}%)
                </Text>
              </View>
              <View style={styles.aiSummaryRow}>
                <Text style={styles.aiSummaryLabel}>Model 2:</Text>
                <Text style={styles.aiSummaryPred}>
                  {aiModel2Result.prediction} ({(aiModel2Result.confidence * 100).toFixed(0)}%)
                </Text>
              </View>
            </View>
          )}

          {/* Classification Grid */}
          <View style={styles.classificationGrid}>
            {TRASH_CLASSIFICATIONS.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.classificationButton,
                  {
                    borderLeftWidth: 4,
                    borderLeftColor: item.color,
                  },
                  selectedClassification === item.id &&
                    styles.classificationButtonSelected,
                ]}
                onPress={() => handleClassificationSelect(item.id)}
              >
                <Text
                  style={[
                    styles.classificationLabel,
                    { fontSize: sizes.textFontSize * 0.85 },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Selected Confirmation */}
          {selectedClassification && (
            <View
              style={[
                styles.confirmBox,
                { marginBottom: sizes.padding, padding: sizes.padding },
              ]}
            >
              <Text style={[styles.confirmText, { fontSize: sizes.textFontSize }]}>
                Your Selection:{" "}
                <Text style={styles.bold}>
                  {TRASH_CLASSIFICATIONS.find(
                    (c) => c.id === selectedClassification
                  )?.label}
                </Text>
              </Text>
            </View>
          )}

          {/* Buttons Container */}
          <View style={[styles.buttonContainer, { gap: sizes.padding }]}>
            <Pressable
              style={[
                styles.button,
                styles.confirmButton,
                !selectedClassification && styles.buttonDisabled,
                { paddingVertical: 14, width: "100%" },
              ]}
              onPress={handleConfirmAndContinue}
              disabled={!selectedClassification || scanning}
            >
              <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
                {scanning ? "Processing..." : "View Recommendation"}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.button,
                styles.cancelButton,
                { paddingVertical: 14, width: "100%" },
              ]}
              onPress={cancelPreview}
              disabled={scanning}
            >
              <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Camera screen
  return (
    <View style={styles.container}>
      <CameraView ref={setCameraRef} style={styles.camera} facing="back" />
      <View style={styles.overlay}>
        <Pressable
          style={[styles.button, scanning && styles.buttonDisabled]}
          onPress={handleScan}
          disabled={scanning}
        >
          <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
            {scanning ? "Processing..." : "Capture Scan"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: "#555" }]}
          onPress={handlePickImage}
          disabled={scanning}
        >
          <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
            Pick from Gallery
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: "#888" }]}
          onPress={() => router.back()}
          disabled={scanning}
        >
          <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
            Back
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

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
  text: { color: "#fff", marginBottom: 20, textAlign: "center" },
  previewContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {},
  previewImage: {
    width: "100%",
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#e0e0e0",
  },
  classificationTitle: {
    color: "#333",
    fontWeight: "700",
    textAlign: "center",
  },

  // AI Summary
  aiSummaryBox: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
  },
  aiSummaryTitle: {
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 8,
  },
  aiSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  aiSummaryLabel: {
    color: "#666",
    fontWeight: "600",
    fontSize: 12,
  },
  aiSummaryPred: {
    color: "#3498db",
    fontWeight: "700",
    fontSize: 12,
  },

  classificationGrid: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 20,
  },
  classificationButton: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "flex-start",
  },
  classificationButtonSelected: {
    backgroundColor: "#e8f8f5",
    borderColor: "#27ae60",
    borderWidth: 2,
  },
  classificationLabel: {
    color: "#333",
    textAlign: "left",
    fontWeight: "600",
  },
  confirmBox: {
    backgroundColor: "#27ae60",
    borderRadius: 8,
  },
  confirmText: { color: "#fff", textAlign: "center" },
  bold: { fontWeight: "700" },
  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  confirmButton: { backgroundColor: "#27ae60" },
  cancelButton: { backgroundColor: "#e74c3c" },
});
