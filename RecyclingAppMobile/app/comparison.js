import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { auth, db } from "./firebaseInit";

const TRASH_CLASSIFICATIONS = [
  { id: "plastic", label: "Plastic Waste" },
  { id: "metal", label: "Metal Waste" },
  { id: "paper", label: "Paper Waste" },
  { id: "battery", label: "Battery Waste" },
  { id: "glass", label: "Glass Waste" },
  { id: "automobile", label: "Automobile Wastes" },
  { id: "organic", label: "Organic Waste" },
  { id: "ewaste", label: "E-waste" },
  { id: "lightbulb", label: "Light Bulbs" },
];

export default function ComparisonScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams();
  const [saving, setSaving] = useState(false);
  const [selectedFinal, setSelectedFinal] = useState(params.userSelection);
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
    let headerFontSize = 20;
    let cardTitleFontSize = 16;
    let labelFontSize = 12;
    let valueFontSize = 14;
    let buttonFontSize = 14;
    let imageHeight = 220;
    let padding = 16;
    let cardMargin = 12;

    if (isMobileSmall) {
      headerFontSize = 18;
      cardTitleFontSize = 14;
      labelFontSize = 11;
      valueFontSize = 12;
      buttonFontSize = 12;
      imageHeight = 180;
      padding = 12;
      cardMargin = 8;
    } else if (isTablet) {
      headerFontSize = 26;
      cardTitleFontSize = 20;
      labelFontSize = 14;
      valueFontSize = 16;
      buttonFontSize = 16;
      imageHeight = 320;
      padding = 20;
      cardMargin = 16;
    }

    if (isLandscape && !isTablet) {
      imageHeight = height * 0.4;
    }

    return {
      headerFontSize,
      cardTitleFontSize,
      labelFontSize,
      valueFontSize,
      buttonFontSize,
      imageHeight,
      padding,
      cardMargin,
    };
  };

  const sizes = getResponsiveSizes();

  const getClassificationLabel = (id) => {
    return TRASH_CLASSIFICATIONS.find((c) => c.id === id)?.label || id;
  };

  const saveScan = async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;

      if (!user) throw new Error("No user logged in");

      console.log(" Saving scan with comparison data...");

      // Save with all 3 predictions
      const docRef = await addDoc(collection(db, "scan"), {
        userId: user.uid,
        email: user.email,
        imageUrl: params.imageUrl,
        timestamp: new Date().toISOString(),
        points: 10,
        // User's manual selection
        userSelection: params.userSelection,
        // AI Model 1 prediction
        aiModel1Prediction: params.aiModel1Prediction,
        aiModel1Confidence: parseFloat(params.aiModel1Confidence) || 0,
        // AI Model 2 prediction
        aiModel2Prediction: params.aiModel2Prediction,
        aiModel2Confidence: parseFloat(params.aiModel2Confidence) || 0,
        // Final confirmed selection
        finalSelection: selectedFinal,
        // For backward compatibility (using final selection as biological)
        biological: selectedFinal,
        // Track if user matched any AI prediction
        matchesAiModel1: selectedFinal === params.aiModel1Prediction,
        matchesAiModel2: selectedFinal === params.aiModel2Prediction,
      });

      console.log("✅ Scan saved successfully with ID:", docRef.id);
      alert("✅ Scan saved successfully!");

      setSaving(false);

      // Redirect to dashboard
      setTimeout(() => {
        router.replace("/dashboard");
      }, 500);
    } catch (err) {
      console.error("Save scan error:", err);
      alert(`Failed to save scan: ${err.message}`);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            padding: sizes.padding,
            paddingHorizontal: sizes.padding * 1.33,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { paddingHorizontal: sizes.padding }]}
        >
          <Text style={[styles.backButtonText, { fontSize: sizes.buttonFontSize }]}>
            ← Back
          </Text>
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { fontSize: sizes.headerFontSize, flex: 1, marginHorizontal: 12 },
          ]}
        >
           Verify Classification
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { padding: sizes.padding, paddingBottom: sizes.padding * 2 },
        ]}
      >
        {/* Image Preview */}
        <Image
          source={{ uri: params.imageUrl }}
          style={[
            styles.previewImage,
            { height: sizes.imageHeight, marginBottom: sizes.cardMargin },
          ]}
        />

        {/* Comparison Title */}
        <Text
          style={[
            styles.comparisonTitle,
            { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding },
          ]}
        >
          Comparing 3 Classifications:
        </Text>

        {/* USER SELECTION CARD */}
        <View
          style={[
            styles.predictionCard,
            styles.userCard,
            { marginBottom: sizes.cardMargin, padding: sizes.padding },
          ]}
        >
          <Text style={[styles.predictionLabel, { fontSize: sizes.labelFontSize }]}>
             Your Selection
          </Text>
          <Text
            style={[
              styles.predictionValue,
              { fontSize: sizes.valueFontSize, marginBottom: sizes.padding * 0.5 },
            ]}
          >
            {getClassificationLabel(params.userSelection)}
          </Text>
          <Text
            style={[styles.predictionNote, { fontSize: sizes.labelFontSize }]}
          >
            ✓ This is what you chose
          </Text>
        </View>

        {/* AI MODEL 1 CARD */}
        <View
          style={[
            styles.predictionCard,
            styles.aiCard,
            { marginBottom: sizes.cardMargin, padding: sizes.padding },
          ]}
        >
          <Text style={[styles.predictionLabel, { fontSize: sizes.labelFontSize }]}>
            AI Model 1 Prediction
          </Text>
          <Text
            style={[
              styles.predictionValue,
              { fontSize: sizes.valueFontSize, marginBottom: sizes.padding * 0.5 },
            ]}
          >
            {params.aiModel1Prediction}
          </Text>
          <Text
            style={[styles.confidence, { fontSize: sizes.labelFontSize }]}
          >
            Confidence: {(parseFloat(params.aiModel1Confidence) * 100).toFixed(1)}%
          </Text>
        </View>

        {/* AI MODEL 2 CARD */}
        <View
          style={[
            styles.predictionCard,
            styles.aiCard2,
            { marginBottom: sizes.cardMargin, padding: sizes.padding },
          ]}
        >
          <Text style={[styles.predictionLabel, { fontSize: sizes.labelFontSize }]}>
             AI Model 2 Prediction
          </Text>
          <Text
            style={[
              styles.predictionValue,
              { fontSize: sizes.valueFontSize, marginBottom: sizes.padding * 0.5 },
            ]}
          >
            {params.aiModel2Prediction}
          </Text>
          <Text
            style={[styles.confidence, { fontSize: sizes.labelFontSize }]}
          >
            Confidence: {(parseFloat(params.aiModel2Confidence) * 100).toFixed(1)}%
          </Text>
        </View>

        {/* Final Selection Info */}
        <View
          style={[
            styles.infoBox,
            { marginBottom: sizes.cardMargin, padding: sizes.padding },
          ]}
        >
          <Text
            style={[
              styles.infoTitle,
              { fontSize: sizes.labelFontSize, marginBottom: sizes.padding * 0.5 },
            ]}
          >
             Final Selection:
          </Text>
          <Text
            style={[
              styles.finalSelection,
              { fontSize: sizes.valueFontSize },
            ]}
          >
            {getClassificationLabel(selectedFinal)}
          </Text>
          <Text
            style={[
              styles.infoText,
              { fontSize: sizes.labelFontSize, marginTop: sizes.padding * 0.5 },
            ]}
          >
            You can change this before saving. Tap any prediction above to update.
          </Text>
        </View>

        {/* Buttons to change selection */}
        <View
          style={[
            styles.changeButtonContainer,
            { marginBottom: sizes.cardMargin, gap: sizes.padding },
          ]}
        >
          <Pressable
            style={[
              styles.changeButton,
              selectedFinal === params.userSelection && styles.changeButtonActive,
              { flex: 1, paddingVertical: sizes.padding * 0.75 },
            ]}
            onPress={() => setSelectedFinal(params.userSelection)}
          >
            <Text
              style={[
                styles.changeButtonText,
                { fontSize: sizes.labelFontSize },
              ]}
            >
              Use Your Choice
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.changeButton,
              selectedFinal === params.aiModel1Prediction && styles.changeButtonActive,
              { flex: 1, paddingVertical: sizes.padding * 0.75 },
            ]}
            onPress={() => setSelectedFinal(params.aiModel1Prediction)}
          >
            <Text
              style={[
                styles.changeButtonText,
                { fontSize: sizes.labelFontSize },
              ]}
            >
              Use AI Model 1
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.changeButton,
              selectedFinal === params.aiModel2Prediction && styles.changeButtonActive,
              { flex: 1, paddingVertical: sizes.padding * 0.75 },
            ]}
            onPress={() => setSelectedFinal(params.aiModel2Prediction)}
          >
            <Text
              style={[
                styles.changeButtonText,
                { fontSize: sizes.labelFontSize },
              ]}
            >
              Use AI Model 2
            </Text>
          </Pressable>
        </View>

        {/* Save Button */}
        <Pressable
          style={[
            styles.button,
            styles.saveButton,
            saving && styles.buttonDisabled,
            { paddingVertical: 14, marginBottom: sizes.padding * 0.5 },
          ]}
          onPress={saveScan}
          disabled={saving}
        >
          <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
            {saving ? "Saving..." : "✅ Confirm & Save"}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.cancelButton,
            saving && styles.buttonDisabled,
            { paddingVertical: 14 },
          ]}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
             Go Back
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  backButton: {
    paddingVertical: 10,
    backgroundColor: "#27ae60",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontWeight: "700",
  },
  headerTitle: {
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  scrollContent: {},
  previewImage: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#ddd",
  },
  comparisonTitle: {
    fontWeight: "700",
    color: "#2c3e50",
    textAlign: "center",
  },
  predictionCard: {
    borderRadius: 10,
    borderLeftWidth: 4,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 3px rgba(0,0,0,0.1)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        }),
  },
  userCard: {
    backgroundColor: "#e8f8f5",
    borderLeftColor: "#27ae60",
  },
  aiCard: {
    backgroundColor: "#e3f2fd",
    borderLeftColor: "#3498db",
  },
  aiCard2: {
    backgroundColor: "#f3e5f5",
    borderLeftColor: "#9c27b0",
  },
  predictionLabel: {
    fontWeight: "700",
    color: "#666",
    marginBottom: 4,
  },
  predictionValue: {
    fontWeight: "700",
    color: "#2c3e50",
  },
  confidence: {
    color: "#7f8c8d",
    fontWeight: "600",
  },
  predictionNote: {
    color: "#27ae60",
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#27ae60",
  },
  infoTitle: {
    fontWeight: "700",
    color: "#2c3e50",
  },
  finalSelection: {
    fontWeight: "700",
    color: "#27ae60",
  },
  infoText: {
    color: "#666",
  },
  changeButtonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  changeButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  changeButtonActive: {
    backgroundColor: "#27ae60",
    borderColor: "#27ae60",
  },
  changeButtonText: {
    fontWeight: "600",
    color: "#333",
  },
  changeButtonText_active: {
    color: "white",
  },
  button: {
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#27ae60",
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  buttonDisabled: {
    backgroundColor: "#95a5a6",
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
});