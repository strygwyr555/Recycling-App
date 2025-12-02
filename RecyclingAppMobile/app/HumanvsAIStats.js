import { useRouter, useFocusEffect } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
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
import { BarChart } from "react-native-chart-kit";

export default function HumanvsAIStatsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [orientation, setOrientation] = useState(
    width > height ? "landscape" : "portrait"
  );

  // Advanced Stats
  const [stats, setStats] = useState({
    totalScans: 0,
    humanAccuracy: 0,
    aiModel1Accuracy: 0,
    aiModel2Accuracy: 0,
    humanAIAgreement: 0,
    aiConsensus: 0,
    kappaCoefficient: 0,
    disagreementRate: 0,
    confidenceCalibration: 0,
  });

  // Chart Data
  const [accuracyComparison, setAccuracyComparison] = useState(null);
  const [confusionMatrix, setConfusionMatrix] = useState(null);
  const [confidenceCalibrationChart, setConfidenceCalibrationChart] = useState(null);
  const [agreementTimeline, setAgreementTimeline] = useState(null);
  const [classificationAccuracy, setClassificationAccuracy] = useState(null);
  const [disagreementAnalysis, setDisagreementAnalysis] = useState(null);

  // Responsive
  const isLandscape = orientation === "landscape";
  const isMobileSmall = width < 375;
  const isTablet = width >= 768;

  useEffect(() => {
    setOrientation(width > height ? "landscape" : "portrait");
  }, [width, height]);

  const getResponsiveSizes = () => {
    let headerFontSize = 20;
    let cardTitleFontSize = 16;
    let chartHeight = 250;
    let padding = 16;
    let chartWidth = width - 40;

    if (isMobileSmall) {
      headerFontSize = 18;
      cardTitleFontSize = 14;
      chartHeight = 200;
      padding = 12;
      chartWidth = width - 30;
    } else if (isTablet) {
      headerFontSize = 26;
      cardTitleFontSize = 20;
      chartHeight = 320;
      padding = 20;
      chartWidth = width - 50;
    }

    return {
      headerFontSize,
      cardTitleFontSize,
      chartHeight,
      padding,
      chartWidth,
    };
  };

  const sizes = getResponsiveSizes();

  const fetchAndProcessData = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const scansRef = collection(db, "scan");
      const q = query(scansRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      const scans = querySnapshot.docs.map((doc) => doc.data());
      const totalScans = scans.length;

      if (totalScans === 0) {
        setStats({
          totalScans: 0,
          humanAccuracy: 0,
          aiModel1Accuracy: 0,
          aiModel2Accuracy: 0,
          humanAIAgreement: 0,
          aiConsensus: 0,
          kappaCoefficient: 0,
          disagreementRate: 0,
          confidenceCalibration: 0,
        });
        setLoading(false);
        return;
      }

      // ===== METRIC 1: Model Accuracy (vs Final Selection) =====
      const aiModel1Correct = scans.filter((s) => {
        const model1Pred = s.results?.model1?.prediction || s.aiModel1Prediction;
        return model1Pred === s.finalSelection;
      }).length;

      const aiModel2Correct = scans.filter((s) => {
        const model2Pred = s.results?.model2?.prediction || s.aiModel2Prediction;
        return model2Pred === s.finalSelection;
      }).length;

      const aiModel1Accuracy = ((aiModel1Correct / totalScans) * 100).toFixed(1);
      const aiModel2Accuracy = ((aiModel2Correct / totalScans) * 100).toFixed(1);

      // ===== METRIC 2: Human Accuracy (user selection vs final) =====
      const humanCorrect = scans.filter((s) => s.userSelection === s.finalSelection).length;
      const humanAccuracy = ((humanCorrect / totalScans) * 100).toFixed(1);

      // ===== METRIC 3: Human-AI Agreement =====
      const humanAgreement = scans.filter((s) => {
        const model1Pred = s.results?.model1?.prediction || s.aiModel1Prediction;
        const model2Pred = s.results?.model2?.prediction || s.aiModel2Prediction;
        return s.userSelection === model1Pred || s.userSelection === model2Pred;
      }).length;
      const humanAIAgreement = ((humanAgreement / totalScans) * 100).toFixed(1);

      // ===== METRIC 4: AI Consensus =====
      const aiConsensusCount = scans.filter((s) => {
        const model1Pred = s.results?.model1?.prediction || s.aiModel1Prediction;
        const model2Pred = s.results?.model2?.prediction || s.aiModel2Prediction;
        return model1Pred === model2Pred;
      }).length;
      const aiConsensus = ((aiConsensusCount / totalScans) * 100).toFixed(1);

      // ===== METRIC 5: Kappa Coefficient =====
      const kappaCoefficient = calculateCohenKappa(scans);

      // ===== METRIC 6: Disagreement Rate =====
      const allDisagree = scans.filter((s) => {
        const model1Pred = s.results?.model1?.prediction || s.aiModel1Prediction;
        const model2Pred = s.results?.model2?.prediction || s.aiModel2Prediction;
        return (
          s.userSelection !== model1Pred &&
          s.userSelection !== model2Pred &&
          model1Pred !== model2Pred
        );
      }).length;
      const disagreementRate = ((allDisagree / totalScans) * 100).toFixed(1);

      // ===== METRIC 7: Confidence Calibration =====
      const calibration = calculateConfidenceCalibration(scans);

      setStats({
        totalScans,
        humanAccuracy: parseFloat(humanAccuracy),
        aiModel1Accuracy: parseFloat(aiModel1Accuracy),
        aiModel2Accuracy: parseFloat(aiModel2Accuracy),
        humanAIAgreement: parseFloat(humanAIAgreement),
        aiConsensus: parseFloat(aiConsensus),
        kappaCoefficient: kappaCoefficient.toFixed(3),
        disagreementRate: parseFloat(disagreementRate),
        confidenceCalibration: calibration.toFixed(2),
      });

      // Build visualizations
      setAccuracyComparison(buildAccuracyChart(scans, totalScans));
      setConfusionMatrix(buildConfusionMatrix(scans));
      setConfidenceCalibrationChart(buildConfidenceCalibration(scans));
      setAgreementTimeline(buildTimelineChart(scans));
      setClassificationAccuracy(buildPerClassAccuracy(scans));
      setDisagreementAnalysis(buildDisagreementPatterns(scans));

      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAndProcessData();
    }, [fetchAndProcessData])
  );

  // ===== HELPER: Extract Model Prediction =====
  const getModelPrediction = (scan, modelKey) => {
    return scan.results?.[modelKey]?.prediction || 
           (modelKey === "model1" ? scan.aiModel1Prediction : scan.aiModel2Prediction);
  };

  // ===== HELPER: Extract Model Confidence =====
  const getModelConfidence = (scan, modelKey) => {
    return scan.results?.[modelKey]?.confidence || 
           (modelKey === "model1" ? scan.aiModel1Confidence : scan.aiModel2Confidence) || 0;
  };

  // ===== HELPER: Cohen's Kappa =====
  const calculateCohenKappa = (scans) => {
    let observed = 0;
    const classFreq = {};

    scans.forEach((s) => {
      const model1Pred = getModelPrediction(s, "model1");
      
      if (s.userSelection === model1Pred) observed++;
      classFreq[s.userSelection] = (classFreq[s.userSelection] || 0) + 1;
      classFreq[model1Pred] = (classFreq[model1Pred] || 0) + 1;
    });

    let expected = 0;
    Object.values(classFreq).forEach((count) => {
      expected += (count / (scans.length * 2)) ** 2;
    });

    const po = observed / scans.length;
    const pe = expected;
    return (po - pe) / (1 - pe) || 0;
  };

  // ===== HELPER: Confidence Calibration =====
  const calculateConfidenceCalibration = (scans) => {
    const bins = {
      "0-20": { correct: 0, total: 0 },
      "20-40": { correct: 0, total: 0 },
      "40-60": { correct: 0, total: 0 },
      "60-80": { correct: 0, total: 0 },
      "80-100": { correct: 0, total: 0 },
    };

    scans.forEach((scan) => {
      const conf1 = parseFloat(getModelConfidence(scan, "model1")) || 0;
      const conf2 = parseFloat(getModelConfidence(scan, "model2")) || 0;
      const avgConf = Math.round(((conf1 + conf2) / 2) * 100);

      let bin;
      if (avgConf < 20) bin = "0-20";
      else if (avgConf < 40) bin = "20-40";
      else if (avgConf < 60) bin = "40-60";
      else if (avgConf < 80) bin = "60-80";
      else bin = "80-100";

      bins[bin].total += 1;

      const model1Pred = getModelPrediction(scan, "model1");
      const model2Pred = getModelPrediction(scan, "model2");
      
      if (model1Pred === scan.finalSelection || model2Pred === scan.finalSelection) {
        bins[bin].correct += 1;
      }
    });

    // Calculate Expected Calibration Error (ECE)
    let ece = 0;
    let validBins = 0;
    Object.values(bins).forEach((bin) => {
      if (bin.total > 0) {
        const accuracy = bin.correct / bin.total;
        ece += Math.abs(accuracy - 0.5); // Simplified ECE
        validBins++;
      }
    });
    return validBins > 0 ? ece / validBins : 0;
  };

  // ===== BUILD: Accuracy Comparison Bar Chart =====
  const buildAccuracyChart = (scans, total) => {
    const aiModel1Correct = scans.filter((s) => 
      getModelPrediction(s, "model1") === s.finalSelection
    ).length;
    const aiModel2Correct = scans.filter((s) => 
      getModelPrediction(s, "model2") === s.finalSelection
    ).length;
    const humanCorrect = scans.filter((s) => s.userSelection === s.finalSelection).length;

    return {
      labels: ["Human", "Model 1", "Model 2"],
      datasets: [
        {
          data: [
            ((humanCorrect / total) * 100),
            ((aiModel1Correct / total) * 100),
            ((aiModel2Correct / total) * 100),
          ],
        },
      ],
    };
  };

  // ===== BUILD: Confusion Matrix =====
  const buildConfusionMatrix = (scans) => {
    const matrix = {
      humanCorrect: 0,
      model1Correct: 0,
      model2Correct: 0,
      bothModelsAgree: 0,
      allAgree: 0,
    };

    scans.forEach((s) => {
      const model1Pred = getModelPrediction(s, "model1");
      const model2Pred = getModelPrediction(s, "model2");

      if (s.userSelection === s.finalSelection) matrix.humanCorrect++;
      if (model1Pred === s.finalSelection) matrix.model1Correct++;
      if (model2Pred === s.finalSelection) matrix.model2Correct++;
      if (model1Pred === model2Pred) matrix.bothModelsAgree++;
      if (
        s.userSelection === model1Pred &&
        model1Pred === model2Pred
      ) {
        matrix.allAgree++;
      }
    });

    return matrix;
  };

  // ===== BUILD: Confidence Calibration Chart =====
  const buildConfidenceCalibration = (scans) => {
    const bins = {
      "0-20%": { correct: 0, total: 0 },
      "20-40%": { correct: 0, total: 0 },
      "40-60%": { correct: 0, total: 0 },
      "60-80%": { correct: 0, total: 0 },
      "80-100%": { correct: 0, total: 0 },
    };

    scans.forEach((scan) => {
      const conf1 = parseFloat(getModelConfidence(scan, "model1")) || 0;
      const conf2 = parseFloat(getModelConfidence(scan, "model2")) || 0;
      const avgConf = ((conf1 + conf2) / 2) * 100;

      let bin;
      if (avgConf < 20) bin = "0-20%";
      else if (avgConf < 40) bin = "20-40%";
      else if (avgConf < 60) bin = "40-60%";
      else if (avgConf < 80) bin = "60-80%";
      else bin = "80-100%";

      bins[bin].total += 1;

      const model1Pred = getModelPrediction(scan, "model1");
      const model2Pred = getModelPrediction(scan, "model2");

      if (model1Pred === scan.finalSelection || model2Pred === scan.finalSelection) {
        bins[bin].correct += 1;
      }
    });

    return bins;
  };

  // ===== BUILD: Agreement Timeline =====
  const buildTimelineChart = (scans) => {
    const byDate = {};
    scans.forEach((scan) => {
      const date = scan.timestamp?.split("T")[0] || "Unknown";
      if (!byDate[date]) {
        byDate[date] = { humanCorrect: 0, model1Correct: 0, model2Correct: 0, total: 0 };
      }
      byDate[date].total += 1;

      const model1Pred = getModelPrediction(scan, "model1");
      const model2Pred = getModelPrediction(scan, "model2");

      if (scan.userSelection === scan.finalSelection) byDate[date].humanCorrect++;
      if (model1Pred === scan.finalSelection) byDate[date].model1Correct++;
      if (model2Pred === scan.finalSelection) byDate[date].model2Correct++;
    });

    return Object.entries(byDate)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-14)
      .map(([date, data]) => ({
        date: date.slice(-5),
        human: data.total > 0 ? ((data.humanCorrect / data.total) * 100).toFixed(0) : 0,
        model1: data.total > 0 ? ((data.model1Correct / data.total) * 100).toFixed(0) : 0,
        model2: data.total > 0 ? ((data.model2Correct / data.total) * 100).toFixed(0) : 0,
      }));
  };

  // ===== BUILD: Per-Classification Accuracy =====
  const buildPerClassAccuracy = (scans) => {
    const classStats = {};

    scans.forEach((scan) => {
      const cls = scan.finalSelection;
      if (!classStats[cls]) {
        classStats[cls] = { humanCorrect: 0, model1Correct: 0, total: 0 };
      }
      classStats[cls].total++;

      const model1Pred = getModelPrediction(scan, "model1");

      if (scan.userSelection === cls) classStats[cls].humanCorrect++;
      if (model1Pred === cls) classStats[cls].model1Correct++;
    });

    return Object.entries(classStats)
      .map(([type, data]) => ({
        type: type.replace(" waste", "").slice(0, 10),
        humanAcc: data.total > 0 ? ((data.humanCorrect / data.total) * 100).toFixed(0) : 0,
        aiAcc: data.total > 0 ? ((data.model1Correct / data.total) * 100).toFixed(0) : 0,
        count: data.total,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  // ===== BUILD: Disagreement Patterns =====
  const buildDisagreementPatterns = (scans) => {
    const patterns = {
      humanCorrect: 0,
      bothAICorrect: 0,
      humanWrong: 0,
      mixedSuccess: 0,
    };

    scans.forEach((scan) => {
      const model1Pred = getModelPrediction(scan, "model1");
      const model2Pred = getModelPrediction(scan, "model2");

      const humanRight = scan.userSelection === scan.finalSelection;
      const model1Right = model1Pred === scan.finalSelection;
      const model2Right = model2Pred === scan.finalSelection;

      if (humanRight && !model1Right && !model2Right) patterns.humanCorrect++;
      else if (!humanRight && model1Right && model2Right) patterns.bothAICorrect++;
      else if (!humanRight && !model1Right && !model2Right) patterns.humanWrong++;
      else patterns.mixedSuccess++;
    });

    return patterns;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={[styles.loadingText, { fontSize: 16 }]}>
          Computing AI statistics...
        </Text>
      </SafeAreaView>
    );
  }

  if (stats.totalScans === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { padding: sizes.padding }]}>
          <Pressable
            onPress={() => router.push("/dashboard")}
            style={[styles.backButton, { paddingHorizontal: sizes.padding }]}
          >
            <Text style={[styles.backButtonText, { fontSize: 14 }]}>← Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { fontSize: sizes.headerFontSize, flex: 1 }]}>
            🤖 Human vs AI
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { fontSize: 16 }]}>
            No scans yet. Start scanning to see human vs AI analysis!
          </Text>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push("/scan")}
          >
            <Text style={styles.buttonText}>📸 Start Scanning</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { padding: sizes.padding }]}>
        <Pressable
          onPress={() => router.push("/dashboard")}
          style={[styles.backButton, { paddingHorizontal: sizes.padding }]}
        >
          <Text style={[styles.backButtonText, { fontSize: 14 }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { fontSize: sizes.headerFontSize, flex: 1 }]}>
          📊 Human vs AI
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { padding: sizes.padding, paddingBottom: sizes.padding * 2 },
        ]}
      >
        {/* KPI Grid */}
        <View style={[styles.card, { marginBottom: sizes.padding, padding: sizes.padding, backgroundColor: "#f0f9ff" }]}>
          <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding }]}>
            📈 Performance Metrics (n={stats.totalScans})
          </Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Human</Text>
              <Text style={[styles.kpiValue, { color: "#e67e22" }]}>
                {stats.humanAccuracy.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Model 1</Text>
              <Text style={[styles.kpiValue, { color: "#3498db" }]}>
                {stats.aiModel1Accuracy.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Model 2</Text>
              <Text style={[styles.kpiValue, { color: "#9c27b0" }]}>
                {stats.aiModel2Accuracy.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Kappa</Text>
              <Text style={[styles.kpiValue, { color: "#27ae60" }]}>
                {stats.kappaCoefficient}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. Accuracy Comparison Bar Chart */}
        {accuracyComparison && (
          <View style={[styles.card, { marginBottom: sizes.padding, padding: sizes.padding }]}>
            <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding }]}>
              📊 Accuracy Comparison
            </Text>
            <View style={{ alignItems: "center" }}>
              <BarChart
                data={accuracyComparison}
                width={sizes.chartWidth}
                height={sizes.chartHeight}
                yAxisLabel=""
                yAxisSuffix="%"
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  color: () => "#27ae60",
                  labelColor: () => "#7f8c8d",
                  barPercentage: 0.6,
                  decimalPlaces: 1,
                }}
                verticalLabelRotation={0}
              />
            </View>
            <Text style={[styles.chartNote, { fontSize: 12, marginTop: sizes.padding }]}>
              🎯 vs Final Selection
            </Text>
          </View>
        )}

        {/* 2. Agreement Patterns */}
        {confusionMatrix && (
          <View style={[styles.card, { marginBottom: sizes.padding, padding: sizes.padding }]}>
            <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding }]}>
              🔀 Decision Agreement
            </Text>
            <View style={styles.matrixRow}>
              <View style={styles.matrixCell}>
                <Text style={styles.matrixLabel}>Human Only</Text>
                <Text style={[styles.matrixValue, { color: "#e67e22" }]}>
                  {confusionMatrix.humanCorrect}
                </Text>
                <Text style={styles.matrixPercent}>
                  {((confusionMatrix.humanCorrect / stats.totalScans) * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.matrixCell}>
                <Text style={styles.matrixLabel}>Models Agree</Text>
                <Text style={[styles.matrixValue, { color: "#3498db" }]}>
                  {confusionMatrix.bothModelsAgree}
                </Text>
                <Text style={styles.matrixPercent}>
                  {((confusionMatrix.bothModelsAgree / stats.totalScans) * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.matrixCell}>
                <Text style={styles.matrixLabel}>All Agree</Text>
                <Text style={[styles.matrixValue, { color: "#27ae60" }]}>
                  {confusionMatrix.allAgree}
                </Text>
                <Text style={styles.matrixPercent}>
                  {((confusionMatrix.allAgree / stats.totalScans) * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 3. Confidence Calibration */}
        {confidenceCalibrationChart && (
          <View style={[styles.card, { marginBottom: sizes.padding, padding: sizes.padding }]}>
            <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding }]}>
              📉 Confidence Calibration (ECE: {stats.confidenceCalibration})
            </Text>
            {Object.entries(confidenceCalibrationChart).map(([bin, data]) => (
              <View key={bin} style={styles.calibrationRow}>
                <Text style={styles.calibrationLabel}>{bin}</Text>
                <View style={styles.calibrationBar}>
                  <View
                    style={[
                      styles.calibrationFill,
                      {
                        width: `${data.total > 0 ? (data.correct / data.total) * 100 : 0}%`,
                        backgroundColor:
                          data.total > 0 && data.correct / data.total > 0.7
                            ? "#27ae60"
                            : data.total > 0 && data.correct / data.total > 0.5
                            ? "#f39c12"
                            : "#e74c3c",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.calibrationText}>
                  {data.correct}/{data.total}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 4. Per-Classification Accuracy */}
        {classificationAccuracy && (
          <View style={[styles.card, { marginBottom: sizes.padding, padding: sizes.padding }]}>
            <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding }]}>
              🗑️ Accuracy by Waste Type
            </Text>
            {classificationAccuracy.map((item, idx) => (
              <View key={idx} style={styles.typeRow}>
                <View style={styles.typeLabel}>
                  <Text style={styles.typeText}>{item.type}</Text>
                  <Text style={styles.typeCount}>n={item.count}</Text>
                </View>
                <View style={styles.typeBarContainer}>
                  <View style={[styles.typeBar, { width: `${item.humanAcc}%`, backgroundColor: "#e67e22" }]} />
                  <View style={[styles.typeBar, { width: `${item.aiAcc}%`, backgroundColor: "#3498db" }]} />
                </View>
                <Text style={styles.typePercentage}>{item.humanAcc}% | {item.aiAcc}%</Text>
              </View>
            ))}
            <Text style={[styles.chartNote, { fontSize: 11, marginTop: sizes.padding }]}>
              🟠 Orange = Human | 🔵 Blue = AI Model 1
            </Text>
          </View>
        )}

        {/* 5. Disagreement Analysis */}
        {disagreementAnalysis && (
          <View style={[styles.card, { marginBottom: sizes.padding, padding: sizes.padding, backgroundColor: "#fff3cd" }]}>
            <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding }]}>
              ⚠️ Disagreement Analysis
            </Text>
            <View style={styles.disagreementBox}>
              <Text style={styles.disagreementLabel}>Human Correct, AI Wrong</Text>
              <Text style={[styles.disagreementValue, { color: "#e67e22" }]}>
                {disagreementAnalysis.humanCorrect}
              </Text>
              <Text style={styles.disagreementPercent}>
                {((disagreementAnalysis.humanCorrect / stats.totalScans) * 100).toFixed(1)}%
              </Text>
            </View>

            <View style={styles.disagreementBox}>
              <Text style={styles.disagreementLabel}>AI Correct, Human Wrong</Text>
              <Text style={[styles.disagreementValue, { color: "#3498db" }]}>
                {disagreementAnalysis.bothAICorrect}
              </Text>
              <Text style={styles.disagreementPercent}>
                {((disagreementAnalysis.bothAICorrect / stats.totalScans) * 100).toFixed(1)}%
              </Text>
            </View>

            <View style={styles.disagreementBox}>
              <Text style={styles.disagreementLabel}>Both Wrong</Text>
              <Text style={[styles.disagreementValue, { color: "#e74c3c" }]}>
                {disagreementAnalysis.humanWrong}
              </Text>
              <Text style={styles.disagreementPercent}>
                {((disagreementAnalysis.humanWrong / stats.totalScans) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        )}

        {/* 6. 14-Day Trends */}
        {agreementTimeline && agreementTimeline.length > 0 && (
          <View style={[styles.card, { marginBottom: sizes.padding, padding: sizes.padding }]}>
            <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding }]}>
              📈 14-Day Trends
            </Text>
            {agreementTimeline.map((point, idx) => (
              <View key={idx} style={styles.trendRow}>
                <Text style={styles.trendDate}>{point.date}</Text>
                <View style={styles.trendBars}>
                  <View style={[styles.trendBar, { width: `${point.human}%`, backgroundColor: "#e67e22" }]} />
                  <View style={[styles.trendBar, { width: `${point.model1}%`, backgroundColor: "#3498db" }]} />
                </View>
                <Text style={styles.trendPercent}>{point.human}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Insights */}
        <View style={[styles.card, { marginBottom: sizes.padding, padding: sizes.padding, backgroundColor: "#e8f5e9" }]}>
          <Text style={[styles.cardTitle, { fontSize: sizes.cardTitleFontSize, marginBottom: sizes.padding }]}>
            💡 Statistical Insights
          </Text>

          <Text style={[styles.insightText, { fontSize: 12, marginBottom: sizes.padding * 0.5 }]}>
            <Text style={styles.bold}>Kappa ({stats.kappaCoefficient}):</Text>
            {"\n"}
            {stats.kappaCoefficient > 0.81
              ? "✅ Almost perfect human-AI agreement"
              : stats.kappaCoefficient > 0.61
              ? "✓ Substantial agreement"
              : "⚠️ Fair to moderate agreement"}
          </Text>

          <Text style={[styles.insightText, { fontSize: 12, marginBottom: sizes.padding * 0.5 }]}>
            <Text style={styles.bold}>Calibration ({stats.confidenceCalibration}):</Text>
            {"\n"}
            {stats.confidenceCalibration < 0.1
              ? "✅ Excellent - High confidence = Correct"
              : "⚠️ Poor - High confidence ≠ Always correct"}
          </Text>

          <Text style={[styles.insightText, { fontSize: 12 }]}>
            <Text style={styles.bold}>Key Finding:</Text>
            {"\n"}
            {stats.aiModel1Accuracy > stats.humanAccuracy
              ? `🤖 AI Model 1 outperforms human by ${(stats.aiModel1Accuracy - stats.humanAccuracy).toFixed(1)}%`
              : `👤 Humans outperform AI by ${(stats.humanAccuracy - stats.aiModel1Accuracy).toFixed(1)}%`}
          </Text>
        </View>

        {/* Buttons */}
        <View style={[styles.buttonContainer, { gap: sizes.padding }]}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push("/scan")}
          >
            <Text style={[styles.buttonText, { fontSize: 14 }]}>📸 Add Scans</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push("/dashboard")}
          >
            <Text style={[styles.buttonText, { fontSize: 14 }]}>← Dashboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  loadingText: { marginTop: 12, color: "#666" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyText: { color: "#999", textAlign: "center", marginBottom: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#ddd" },
  backButton: { paddingVertical: 10, backgroundColor: "#27ae60", borderRadius: 8, justifyContent: "center", alignItems: "center" },
  backButtonText: { color: "white", fontWeight: "700" },
  headerTitle: { fontWeight: "bold", color: "#333", textAlign: "center" },
  scrollContent: {},
  card: { backgroundColor: "white", borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  cardTitle: { fontWeight: "700", color: "#2c3e50" },
  chartNote: { color: "#999", marginTop: 8, textAlign: "center", fontStyle: "italic" },

  // KPI
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpiBox: { flex: 1, minWidth: 90, padding: 12, backgroundColor: "white", borderRadius: 8, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  kpiLabel: { fontSize: 11, color: "#7f8c8d", marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: "700" },

  // Matrix
  matrixRow: { flexDirection: "row", gap: 12 },
  matrixCell: { flex: 1, padding: 12, backgroundColor: "#f9f9f9", borderRadius: 8, alignItems: "center" },
  matrixLabel: { fontSize: 11, color: "#666", marginBottom: 6, fontWeight: "600" },
  matrixValue: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  matrixPercent: { fontSize: 10, color: "#999" },

  // Calibration
  calibrationRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  calibrationLabel: { width: 50, fontSize: 11, fontWeight: "600", color: "#333" },
  calibrationBar: { flex: 1, height: 10, backgroundColor: "#eee", marginHorizontal: 8, borderRadius: 5, overflow: "hidden" },
  calibrationFill: { height: "100%", borderRadius: 5 },
  calibrationText: { width: 50, textAlign: "right", fontSize: 10, color: "#666" },

  // Type
  typeRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  typeLabel: { width: 80 },
  typeText: { fontSize: 11, fontWeight: "600", color: "#333" },
  typeCount: { fontSize: 9, color: "#999" },
  typeBarContainer: { flex: 1, height: 12, flexDirection: "row", marginHorizontal: 8, gap: 1, backgroundColor: "#f0f0f0", borderRadius: 3, overflow: "hidden" },
  typeBar: { height: "100%" },
  typePercentage: { width: 55, textAlign: "right", fontSize: 10, color: "#666", fontWeight: "600" },

  // Disagreement
  disagreementBox: { padding: 10, marginBottom: 10, backgroundColor: "white", borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#f39c12" },
  disagreementLabel: { fontSize: 11, color: "#666", marginBottom: 4, fontWeight: "600" },
  disagreementValue: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  disagreementPercent: { fontSize: 10, color: "#999" },

  // Trends
  trendRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  trendDate: { width: 40, fontSize: 9, color: "#999", fontWeight: "600" },
  trendBars: { flex: 1, height: 6, flexDirection: "row", marginHorizontal: 8, gap: 1 },
  trendBar: { height: "100%", borderRadius: 1 },
  trendPercent: { width: 35, textAlign: "right", fontSize: 9, color: "#666", fontWeight: "600" },

  // Insights
  insightText: { color: "#27ae60", lineHeight: 18 },
  bold: { fontWeight: "700", color: "#2c3e50" },

  // Buttons
  buttonContainer: { marginTop: 12 },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  primaryButton: { backgroundColor: "#27ae60" },
  secondaryButton: { backgroundColor: "#3498db" },
  buttonText: { color: "white", fontWeight: "700" },
});