import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebaseInit";
import {
  getReasoningExplanation,
  getRecommendationColor,
} from "./utils/ensembleClassifier";

/* -----------------------------------------------------
   LABEL NORMALIZATION — clean labels for final.js
----------------------------------------------------- */
const CLEAN_LABELS = {
  metal_waste: "Metal Waste",
  metal: "Metal Waste",
  organic_waste: "Organic Waste",
  organic: "Organic Waste",
  paper_waste: "Paper Waste",
  paper: "Paper Waste",
  plastic_waste: "Plastic Waste",
  plastic: "Plastic Waste",
  battery_waste: "Battery Waste",
  battery: "Battery Waste",
  white_glass: "White Glass Waste",
  green_glass: "Green Glass Waste",
  brown_glass: "Brown Glass Waste",

  cardboard_waste: "Cardboard Waste",
  cardboard: "Cardboard Waste",
  clothing_waste: "Clothing Waste",
  clothing: "Clothing Waste",
  e_waste: "E-waste",
  e: "E-waste",
  trash: "Trash",
};

function formatLabel(raw) {
  if (!raw) return "";

  let clean = raw.trim().toLowerCase();

  clean = clean.replace(/[- ]/g, "_");
  clean = clean.replace(/_+$/, "");

  return CLEAN_LABELS[clean] || raw;
}

/* -----------------------------------------------------
   MAIN SCREEN
----------------------------------------------------- */

export default function FinalClassificationScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams();
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const imageUrl = params.imageUrl;
  const previewUri = params.previewUri;
  const userSelection = params.userSelection;
  const ensembleResult = JSON.parse(params.ensembleResult || "{}");

  const {
    finalSelection,
    confidence,
    reasoning,
    breakdown,
    ensembleMetrics,
  } = ensembleResult;

  console.log("FINAL SELECTION RAW:", finalSelection);


  const isMobileSmall = width < 375;
  const isTablet = width >= 768;

  const getResponsiveSizes = () => {
    let headerFontSize = 20;
    let titleFontSize = 18;
    let textFontSize = 14;
    let imageHeight = 240;
    let padding = 16;

    if (isMobileSmall) {
      headerFontSize = 18;
      titleFontSize = 16;
      textFontSize = 12;
      imageHeight = 180;
      padding = 12;
    } else if (isTablet) {
      headerFontSize = 26;
      titleFontSize = 22;
      textFontSize = 16;
      imageHeight = 320;
      padding = 20;
    }

    return { headerFontSize, titleFontSize, textFontSize, imageHeight, padding };
  };

  const sizes = getResponsiveSizes();

  /* -----------------------------------------------------
     SAVE TO FIRESTORE
  ----------------------------------------------------- */
  const handleSaveAndContinue = useCallback(async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;

      if (!user) {
        alert("Not authenticated. Please sign in.");
        setSaving(false);
        return;
      }

      const scanData = {
        email: user.email,
        uid: user.uid,
        timestamp: serverTimestamp(),

        imageUrl: imageUrl,

        userSelection: userSelection,

        results: {
          mobilenet: breakdown.model1,
          rexnet: breakdown.model2,
        },

        finalSelection: finalSelection,
        ensembleConfidence: confidence,
        ensembleReasoning: reasoning,

        ensembleMetrics: {
          allAgree: ensembleMetrics?.allAgree || false,
          aiConsensus: ensembleMetrics?.aiConsensus || false,
          humanAIAlignment: ensembleMetrics?.humanAIAlignment || false,
          recommendationStrength: ensembleMetrics?.recommendationStrength,
          flags: ensembleMetrics?.flags || [],
        },

        aiModel1Prediction: breakdown.model1?.prediction,
        aiModel1Confidence: breakdown.model1?.confidence,
        aiModel2Prediction: breakdown.model2?.prediction,
        aiModel2Confidence: breakdown.model2?.confidence,
      };

      const scansRef = collection(db, "scan");
      const docRef = await addDoc(scansRef, scanData);

      console.log("✅ Scan saved to Firestore:", docRef.id);
      setConfirmed(true);

      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      console.error("❌ Error saving scan:", err);
      alert("Failed to save scan. Please try again.");
      setSaving(false);
    }
  }, [
    imageUrl,
    userSelection,
    breakdown,
    finalSelection,
    confidence,
    reasoning,
    ensembleMetrics,
    router,
  ]);

  /* -----------------------------------------------------
     DETAIL BOX RENDERER — now using formatLabel()
  ----------------------------------------------------- */
  const renderClassificationDetail = (label, prediction, confidence, color) => (
    <View style={[styles.detailBox, { borderLeftColor: color }]}>
      <Text style={[styles.detailLabel, { fontSize: sizes.textFontSize * 0.9 }]}>
        {label}
      </Text>

      <Text
        style={[
          styles.detailPrediction,
          { fontSize: sizes.titleFontSize, color },
        ]}
      >
        {formatLabel(prediction) || "No prediction"}
      </Text>

      {confidence !== undefined && (
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              {
                width: `${Math.min(confidence * 100, 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      )}

      {confidence !== undefined && (
        <Text
          style={[
            styles.confidenceText,
            { fontSize: sizes.textFontSize * 0.8 },
          ]}
        >
          Confidence: {(confidence * 100).toFixed(1)}%
        </Text>
      )}
    </View>
  );

  /* -----------------------------------------------------
     SAVED SCREEN
  ----------------------------------------------------- */
  if (confirmed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.successContainer, { padding: sizes.padding }]}>
          <Text style={[styles.successEmoji, { fontSize: 60 }]}>✅</Text>
          <Text style={[styles.successTitle, { fontSize: sizes.titleFontSize }]}>
            Classification Saved!
          </Text>
          <Text style={[styles.successText, { fontSize: sizes.textFontSize }]}>
            Your scan has been recorded and will help improve our models.
          </Text>
          <ActivityIndicator
            size="large"
            color="#27ae60"
            style={{ marginTop: 20 }}
          />
          <Text
            style={[
              styles.successSubtext,
              { fontSize: sizes.textFontSize * 0.9 },
            ]}
          >
            Redirecting to dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* -----------------------------------------------------
     FINAL RECOMMENDATION SCREEN
  ----------------------------------------------------- */
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { padding: sizes.padding }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { fontSize: 14 }]}>← Back</Text>
        </Pressable>

        <Text
          style={[
            styles.headerTitle,
            { fontSize: sizes.headerFontSize, flex: 1, textAlign: "center" },
          ]}
        >
          📊 Final Recommendation
        </Text>

        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { padding: sizes.padding, paddingBottom: sizes.padding * 2 },
        ]}
      >
        {/* Image */}
        {previewUri && (
          <Image
            source={{ uri: previewUri }}
            style={[styles.image, { height: sizes.imageHeight }]}
          />
        )}

        {/* Recommendation Card */}
        <View
          style={[
            styles.recommendationCard,
            {
              borderTopColor: getRecommendationColor(
                ensembleMetrics?.recommendationStrength
              ),
              padding: sizes.padding,
            },
          ]}
        >
          <Text
            style={[
              styles.recommendationLabel,
              { fontSize: sizes.textFontSize * 0.9 },
            ]}
          >
            FINAL RECOMMENDATION
          </Text>

          <Text
            style={[
              styles.recommendationValue,
              {
                fontSize: sizes.titleFontSize * 1.2,
                color: getRecommendationColor(
                  ensembleMetrics?.recommendationStrength
                ),
              },
            ]}
          >
            {formatLabel(finalSelection) || "Unable to classify"}
          </Text>

          {/* Confidence Bar */}
          <View
            style={[styles.confidenceContainer, { marginTop: sizes.padding }]}
          >
            <Text
              style={[styles.confidenceLabel, { fontSize: sizes.textFontSize }]}
            >
              Recommendation Strength
            </Text>

            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${confidence * 100}%`,
                    backgroundColor: getRecommendationColor(
                      ensembleMetrics?.recommendationStrength
                    ),
                  },
                ]}
              />
            </View>

            <Text
              style={[
                styles.confidencePercent,
                { fontSize: sizes.textFontSize * 0.9 },
              ]}
            >
              {(confidence * 100).toFixed(1)}%
            </Text>
          </View>

          {/* Reasoning */}
          <Text
            style={[
              styles.reasoningLabel,
              { fontSize: sizes.textFontSize * 0.9, marginTop: sizes.padding },
            ]}
          >
            Why this recommendation?
          </Text>

          <Text
            style={[
              styles.reasoningText,
              { fontSize: sizes.textFontSize * 0.85 },
            ]}
          >
            {getReasoningExplanation(reasoning)}
          </Text>
        </View>

        {/* Breakdown Section */}
        <View style={{ marginTop: sizes.padding }}>
          {/* Human */}
          {renderClassificationDetail(
            "🧑 Your Selection",
            userSelection ? formatLabel(userSelection) : "",
            undefined,
            "#e67e22"
          )}

          {/* Model 1 */}
          {breakdown?.model1 &&
            renderClassificationDetail(
              "🤖 AI Model 1 (MobileNet)",
              formatLabel(breakdown.model1.prediction),
              breakdown.model1.confidence,
              "#3498db"
            )}

          {/* Model 2 */}
          {breakdown?.model2 &&
            renderClassificationDetail(
              "🧠 AI Model 2 (ReXNet)",
              formatLabel(breakdown.model2.prediction),
              breakdown.model2.confidence,
              "#9c27b0"
            )}

          {/* Agreement Summary */}
          <View
            style={[styles.agreementBox, { marginTop: sizes.padding }]}
          >
            <Text
              style={[
                styles.agreementTitle,
                { fontSize: sizes.textFontSize * 0.9 },
              ]}
            >
              Agreement Analysis:
            </Text>

            <View style={styles.agreementRow}>
              <Text
                style={[
                  styles.agreementLabel,
                  { fontSize: sizes.textFontSize * 0.85 },
                ]}
              >
                {ensembleMetrics?.allAgree ? "✅" : "⚠️"} All three agree
              </Text>
            </View>

            <View style={styles.agreementRow}>
              <Text
                style={[
                  styles.agreementLabel,
                  { fontSize: sizes.textFontSize * 0.85 },
                ]}
              >
                {ensembleMetrics?.aiConsensus ? "✅" : "⚠️"} AI models agree
              </Text>
            </View>

            <View style={styles.agreementRow}>
              <Text
                style={[
                  styles.agreementLabel,
                  { fontSize: sizes.textFontSize * 0.85 },
                ]}
              >
                {ensembleMetrics?.humanAIAlignment ? "✅" : "⚠️"} Human-AI aligned
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View
          style={[
            styles.buttonContainer,
            { gap: sizes.padding, marginTop: sizes.padding },
          ]}
        >
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleSaveAndContinue}
            disabled={saving}
          >
            <Text
              style={[styles.buttonText, { fontSize: sizes.textFontSize }]}
            >
              {saving ? "Saving..." : "✅ Save & Continue"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text
              style={[styles.buttonText, { fontSize: sizes.textFontSize }]}
            >
              ← Edit Selection
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -----------------------------------------------------
   STYLES (unchanged)
----------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
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
    paddingHorizontal: 12,
    backgroundColor: "#27ae60",
    borderRadius: 8,
  },
  backButtonText: { color: "white", fontWeight: "700" },
  headerTitle: { fontWeight: "bold", color: "#333" },
  scrollContent: {},

  image: {
    width: "100%",
    borderRadius: 12,
    marginBottom: 20,
  },

  recommendationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderTopWidth: 4,
    marginBottom: 20,
  },
  recommendationLabel: {
    color: "#888",
    fontWeight: "700",
    marginBottom: 4,
  },
  recommendationValue: {
    fontWeight: "800",
    textTransform: "capitalize",
    marginBottom: 8,
  },

  confidenceContainer: {},
  confidenceLabel: { fontWeight: "600", marginBottom: 6 },
  confidenceBar: {
    width: "100%",
    height: 10,
    backgroundColor: "#eee",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 4,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 6,
  },
  confidencePercent: {
    fontWeight: "700",
    color: "#333",
  },

  reasoningLabel: {
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
  reasoningText: {
    color: "#555",
    lineHeight: 20,
  },

  detailBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 5,
    marginBottom: 15,
  },
  detailLabel: { fontWeight: "600", color: "#555" },
  detailPrediction: {
    fontWeight: "800",
    marginTop: 4,
    textTransform: "capitalize",
  },
  confidenceText: {
    marginTop: 6,
    fontWeight: "600",
    color: "#555",
  },

  agreementBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#888",
  },
  agreementTitle: { fontWeight: "700", marginBottom: 8 },
  agreementRow: { marginBottom: 4 },
  agreementLabel: { color: "#555" },

  buttonContainer: { alignItems: "center" },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButton: { backgroundColor: "#27ae60" },
  secondaryButton: { backgroundColor: "#777" },
  buttonText: { color: "#fff", fontWeight: "700" },

  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successEmoji: {},
  successTitle: { fontWeight: "800", marginTop: 10 },
  successText: { color: "#555", marginTop: 8 },
  successSubtext: { color: "#777", marginTop: 6 },
});
