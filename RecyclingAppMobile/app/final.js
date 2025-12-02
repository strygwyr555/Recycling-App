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

export default function FinalClassificationScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams();
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Parse parameters
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

  // Responsive
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

  // Save scan to Firestore
  const handleSaveAndContinue = useCallback(async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;

      if (!user) {
        alert("Not authenticated. Please sign in.");
        setSaving(false);
        return;
      }

      // Prepare data for Firestore
      const scanData = {
        email: user.email,
        uid: user.uid,
        timestamp: serverTimestamp(),

        // Image data
        imageUrl: imageUrl,

        // User input
        userSelection: userSelection,

        // AI predictions (dual model format)
        results: {
          mobilenet: breakdown.model1,
          rexnet: breakdown.model2,
        },

        // Ensemble result
        finalSelection: finalSelection,
        ensembleConfidence: confidence,
        ensembleReasoning: reasoning,

        // Metrics (for analytics)
        ensembleMetrics: {
          allAgree: ensembleMetrics?.allAgree || false,
          aiConsensus: ensembleMetrics?.aiConsensus || false,
          humanAIAlignment: ensembleMetrics?.humanAIAlignment || false,
          recommendationStrength: ensembleMetrics?.recommendationStrength,
          flags: ensembleMetrics?.flags || [],
        },

        // Legacy fields for backwards compatibility
        aiModel1Prediction: breakdown.model1?.prediction,
        aiModel1Confidence: breakdown.model1?.confidence,
        aiModel2Prediction: breakdown.model2?.prediction,
        aiModel2Confidence: breakdown.model2?.confidence,
      };

      // Save to Firestore
      const scansRef = collection(db, "scan");
      const docRef = await addDoc(scansRef, scanData);

      console.log("✅ Scan saved to Firestore:", docRef.id);
      setConfirmed(true);

      // Navigate to dashboard after 1 second
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      console.error("❌ Error saving scan:", err);
      alert("Failed to save scan. Please try again.");
      setSaving(false);
    }
  }, [imageUrl, userSelection, breakdown, finalSelection, confidence, reasoning, ensembleMetrics, router]);

  // Render classification detail box
  const renderClassificationDetail = (label, prediction, confidence, color) => (
    <View style={[styles.detailBox, { borderLeftColor: color }]}>
      <Text style={[styles.detailLabel, { fontSize: sizes.textFontSize * 0.9 }]}>
        {label}
      </Text>
      <Text style={[styles.detailPrediction, { fontSize: sizes.titleFontSize, color }]}>
        {prediction || "No prediction"}
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
        <Text style={[styles.confidenceText, { fontSize: sizes.textFontSize * 0.8 }]}>
          Confidence: {(confidence * 100).toFixed(1)}%
        </Text>
      )}
    </View>
  );

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
          <ActivityIndicator size="large" color="#27ae60" style={{ marginTop: 20 }} />
          <Text style={[styles.successSubtext, { fontSize: sizes.textFontSize * 0.9 }]}>
            Redirecting to dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { padding: sizes.padding }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
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
        {/* Image Preview */}
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
              borderTopColor: getRecommendationColor(ensembleMetrics?.recommendationStrength),
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
                color: getRecommendationColor(ensembleMetrics?.recommendationStrength),
              },
            ]}
          >
            {finalSelection || "Unable to classify"}
          </Text>

          {/* Confidence Score */}
          <View style={[styles.confidenceContainer, { marginTop: sizes.padding }]}>
            <Text style={[styles.confidenceLabel, { fontSize: sizes.textFontSize }]}>
              Recommendation Strength
            </Text>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${confidence * 100}%`,
                    backgroundColor: getRecommendationColor(ensembleMetrics?.recommendationStrength),
                  },
                ]}
              />
            </View>
            <Text style={[styles.confidencePercent, { fontSize: sizes.textFontSize * 0.9 }]}>
              {(confidence * 100).toFixed(1)}% • {ensembleMetrics?.recommendationStrength}
            </Text>
          </View>

          {/* Reasoning */}
          <View style={[styles.reasoningBox, { marginTop: sizes.padding }]}>
            <Text style={[styles.reasoningLabel, { fontSize: sizes.textFontSize * 0.9 }]}>
              Why this recommendation?
            </Text>
            <Text style={[styles.reasoningText, { fontSize: sizes.textFontSize }]}>
              {getReasoningExplanation(reasoning)}
            </Text>
          </View>

          {/* Flags */}
          {ensembleMetrics?.flags && ensembleMetrics.flags.length > 0 && (
            <View style={[styles.flagsContainer, { marginTop: sizes.padding }]}>
              <Text style={[styles.flagsLabel, { fontSize: sizes.textFontSize * 0.9 }]}>
                Metadata:
              </Text>
              {ensembleMetrics.flags.map((flag, idx) => (
                <View key={idx} style={styles.flag}>
                  <Text style={[styles.flagText, { fontSize: sizes.textFontSize * 0.8 }]}>
                    • {flag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Detailed Breakdown */}
        <View style={[styles.breakdownCard, { marginTop: sizes.padding, padding: sizes.padding }]}>
          <Text
            style={[
              styles.breakdownTitle,
              { fontSize: sizes.titleFontSize, marginBottom: sizes.padding },
            ]}
          >
            📋 Detailed Breakdown
          </Text>

          {/* Your Selection */}
          {renderClassificationDetail(
            "👤 Your Selection",
            userSelection,
            undefined,
            "#e67e22"
          )}

          {/* Model 1 */}
          {breakdown?.model1 &&
            renderClassificationDetail(
              "🤖 AI Model 1 (MobileNet)",
              breakdown.model1.prediction,
              breakdown.model1.confidence,
              "#3498db"
            )}

          {/* Model 2 */}
          {breakdown?.model2 &&
            renderClassificationDetail(
              "🧠 AI Model 2 (ReXNet)",
              breakdown.model2.prediction,
              breakdown.model2.confidence,
              "#9c27b0"
            )}

          {/* Agreement Indicators */}
          <View style={[styles.agreementBox, { marginTop: sizes.padding }]}>
            <Text
              style={[
                styles.agreementTitle,
                { fontSize: sizes.textFontSize * 0.9 },
              ]}
            >
              Agreement Analysis:
            </Text>
            <View style={styles.agreementRow}>
              <Text style={[styles.agreementLabel, { fontSize: sizes.textFontSize * 0.85 }]}>
                {ensembleMetrics?.allAgree ? "✅" : "⚠️"} All three agree
              </Text>
            </View>
            <View style={styles.agreementRow}>
              <Text style={[styles.agreementLabel, { fontSize: sizes.textFontSize * 0.85 }]}>
                {ensembleMetrics?.aiConsensus ? "✅" : "⚠️"} AI models agree
              </Text>
            </View>
            <View style={styles.agreementRow}>
              <Text style={[styles.agreementLabel, { fontSize: sizes.textFontSize * 0.85 }]}>
                {ensembleMetrics?.humanAIAlignment ? "✅" : "⚠️"} Human-AI aligned
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[styles.buttonContainer, { gap: sizes.padding, marginTop: sizes.padding }]}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleSaveAndContinue}
            disabled={saving}
          >
            <Text style={[styles.buttonText, { fontSize: sizes.textFontSize }]}>
              {saving ? "Saving..." : "✅ Save & Continue"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={[styles.buttonText, { fontSize: sizes.textFontSize }]}>
              ← Edit Selection
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    backgroundColor: "#e0e0e0",
  },

  // Recommendation Card
  recommendationCard: {
    backgroundColor: "white",
    borderRadius: 12,
    borderTopWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  recommendationLabel: {
    color: "#999",
    fontWeight: "700",
    letterSpacing: 1,
  },
  recommendationValue: {
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },

  // Confidence
  confidenceContainer: {},
  confidenceLabel: {
    color: "#666",
    fontWeight: "600",
    marginBottom: 8,
  },
  confidenceBar: {
    height: 12,
    backgroundColor: "#eee",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 6,
  },
  confidencePercent: {
    color: "#999",
    fontWeight: "600",
  },

  // Reasoning
  reasoningBox: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
  },
  reasoningLabel: {
    color: "#666",
    fontWeight: "700",
    marginBottom: 6,
  },
  reasoningText: {
    color: "#2c3e50",
    lineHeight: 20,
  },

  // Flags
  flagsContainer: {},
  flagsLabel: {
    color: "#666",
    fontWeight: "700",
    marginBottom: 8,
  },
  flag: {
    marginBottom: 6,
  },
  flagText: {
    color: "#e67e22",
    fontWeight: "500",
  },

  // Breakdown
  breakdownCard: {
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  breakdownTitle: {
    color: "#2c3e50",
    fontWeight: "700",
  },

  // Detail Boxes
  detailBox: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  detailLabel: {
    color: "#999",
    fontWeight: "600",
    marginBottom: 4,
  },
  detailPrediction: {
    fontWeight: "700",
    marginBottom: 8,
  },
  confidenceText: {
    color: "#999",
    fontWeight: "500",
  },

  // Agreement
  agreementBox: {
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60",
  },
  agreementTitle: {
    color: "#666",
    fontWeight: "700",
    marginBottom: 8,
  },
  agreementRow: {
    marginBottom: 6,
  },
  agreementLabel: {
    color: "#2c3e50",
    fontWeight: "500",
  },

  // Buttons
  buttonContainer: { marginTop: 12 },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  primaryButton: { backgroundColor: "#27ae60" },
  secondaryButton: { backgroundColor: "#3498db" },
  buttonText: { color: "white", fontWeight: "700" },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successEmoji: { marginBottom: 16 },
  successTitle: { fontWeight: "700", color: "#2c3e50", marginBottom: 12 },
  successText: { color: "#666", textAlign: "center", marginBottom: 20 },
  successSubtext: { color: "#999", marginTop: 12 },
});