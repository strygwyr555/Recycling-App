import { useRouter, useFocusEffect } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Pressable,
  Dimensions,
} from "react-native";
import { auth, db } from "./firebaseInit";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";

const WASTE_TYPE_LABELS = {
  "metal_waste": "Metal Waste",
  "organic_waste": "Organic Waste",
  "paper_waste": "Paper Waste",
  "plastic_waste": "Plastic Waste",
  "battery_waste": "Battery Waste",
  "white_glass": "White Glass",
  "green_glass": "Green Glass",
  "brown_glass": "Brown Glass",
  "cardboard_waste": "Cardboard Waste",
  "clothing_waste": "Clothing Waste",
  "e_waste": "E-waste",
  "trash": "Trash",
};

const COLORS = {
  human: "#3498db",
  model1: "#e74c3c",
  model2: "#f39c12",
  match: "#27ae60",
  mismatch: "#e74c3c",
};

export default function HumanvsAIStats() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState({
    totalScans: 0,
    humanModel1Match: 0,
    humanModel2Match: 0,
    model1Model2Match: 0,
    allThreeMatch: 0,
    humanVsEnsembleMatch: 0,
    humanAccuracy: 0,
    model1Accuracy: 0,
    model2Accuracy: 0,
    model1AvgConfidence: 0,
    model2AvgConfidence: 0,
    humanClassificationCounts: {},
    model1ClassificationCounts: {},
    model2ClassificationCounts: {},
    accuracyTrend: [],
  });

  const [orientation, setOrientation] = useState(
    width > height ? "landscape" : "portrait"
  );

  useEffect(() => {
    setOrientation(width > height ? "landscape" : "portrait");
  }, [width, height]);

  const isTablet = width >= 768;
  const chartWidth = isTablet ? width - 40 : width - 30;

  /** ======================================
   * FETCH AND ANALYZE DATA
   ====================================== */
  const fetchAndAnalyze = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const scansRef = collection(db, "scan");
      const q = query(scansRef, where("email", "==", user.email));
      const snapshot = await getDocs(q);
      const allScans = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      setScans(allScans);

      // Calculate statistics
      const analyzed = analyzeComparisons(allScans);
      setStats(analyzed);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeComparisons = (allScans) => {
    let humanModel1Match = 0;
    let humanModel2Match = 0;
    let model1Model2Match = 0;
    let allThreeMatch = 0;
    let humanVsEnsembleMatch = 0;

    let humanClassificationCounts = {};
    let model1ClassificationCounts = {};
    let model2ClassificationCounts = {};
    let accuracyTrend = [];

    let totalModel1Confidence = 0;
    let totalModel2Confidence = 0;

    // track correct counts for accuracy
    let model1Correct = 0;
    let model2Correct = 0;

    allScans.forEach((scan, index) => {
      // prefer top-level fields but fall back to nested results (mobilenet/rexnet)
      const human = scan.userSelection;
      const model1 = scan.aiModel1Prediction || scan.results?.mobilenet?.prediction || null;
      const model2 = scan.aiModel2Prediction || scan.results?.rexnet?.prediction || null;
      const ensemble = scan.finalSelection || scan.classification || scan.result || null;

      // Count classifications
      humanClassificationCounts[human] =
        (humanClassificationCounts[human] || 0) + 1;
      model1ClassificationCounts[model1] =
        (model1ClassificationCounts[model1] || 0) + 1;
      model2ClassificationCounts[model2] =
        (model2ClassificationCounts[model2] || 0) + 1;

      // Match counts (use strict equality of the raw labels)
      if (human && model1 && human === model1) humanModel1Match++;
      if (human && model2 && human === model2) humanModel2Match++;
      if (model1 && model2 && model1 === model2) model1Model2Match++;
      if (human && model1 && model2 && human === model1 && model1 === model2) allThreeMatch++;
      if (human && ensemble && human === ensemble) humanVsEnsembleMatch++;

      // Count model correctness vs ensemble
      if (model1 && ensemble && model1 === ensemble) model1Correct++;
      if (model2 && ensemble && model2 === ensemble) model2Correct++;

      // Confidence scores
      totalModel1Confidence += scan.aiModel1Confidence || 0;
      totalModel2Confidence += scan.aiModel2Confidence || 0;

      // Trend (cumulative accuracy over time)
      const matchCount = (human && ensemble && human === ensemble ? 1 : 0);
      accuracyTrend.push({
        scan: index + 1,
        accuracy: matchCount,
      });
    });

    const totalScans = allScans.length;

    return {
      totalScans,
      humanModel1Match,
      humanModel2Match,
      model1Model2Match,
      allThreeMatch,
      humanVsEnsembleMatch,
      humanAccuracy: totalScans > 0 ? (humanVsEnsembleMatch / totalScans) * 100 : 0,
      model1Accuracy: totalScans > 0 ? (model1Correct / totalScans) * 100 : 0,
      model2Accuracy: totalScans > 0 ? (model2Correct / totalScans) * 100 : 0,
      model1AvgConfidence:
        totalScans > 0 ? (totalModel1Confidence / totalScans) * 100 : 0,
      model2AvgConfidence:
        totalScans > 0 ? (totalModel2Confidence / totalScans) * 100 : 0,
      humanClassificationCounts,
      model1ClassificationCounts,
      model2ClassificationCounts,
      accuracyTrend,
    };
  };

  useEffect(() => {
    fetchAndAnalyze();
  }, [fetchAndAnalyze]);

  useFocusEffect(
    useCallback(() => {
      fetchAndAnalyze();
    }, [fetchAndAnalyze])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Analyzing comparisons...</Text>
      </SafeAreaView>
    );
  }

  if (stats.totalScans === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push("/dashboard")}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Human vs AI Analysis</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scans yet. Start scanning!</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Chart data for Match Comparison
  const matchChartData = {
    labels: ["Human vs\nModel1", "Human vs\nModel2", "Model1 vs\nModel2", "All\nThree"],
    datasets: [
      {
        data: [
          stats.humanModel1Match,
          stats.humanModel2Match,
          stats.model1Model2Match,
          stats.allThreeMatch,
        ],
      },
    ],
  };

  // Chart data for Confidence Scores
  const confidenceChartData = {
    labels: ["Model 1", "Model 2"],
    datasets: [
      {
        data: [stats.model1AvgConfidence, stats.model2AvgConfidence],
      },
    ],
  };

  // Pie chart for accuracy
  const accuracyPieData = [
    {
      name: "Human Correct",
      population: stats.humanVsEnsembleMatch,
      color: COLORS.match,
      legendFontColor: "#333",
      legendFontSize: 12,
    },
    {
      name: "Human Incorrect",
      population: stats.totalScans - stats.humanVsEnsembleMatch,
      color: COLORS.mismatch,
      legendFontColor: "#333",
      legendFontSize: 12,
    },
  ];

  // Top classifications - Human
  const topHumanClassifications = Object.entries(stats.humanClassificationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top classifications - Model 1
  const topModel1Classifications = Object.entries(stats.model1ClassificationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top classifications - Model 2
  const topModel2Classifications = Object.entries(stats.model2ClassificationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/dashboard")}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Human vs AI Analysis</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* OVERVIEW CARDS */}
        <View style={styles.cardRow}>
          <View style={[styles.card, styles.cardSmall]}>
            <Text style={styles.cardLabel}>Total Scans</Text>
            <Text style={styles.cardValue}>{stats.totalScans}</Text>
          </View>
          <View style={[styles.card, styles.cardSmall]}>
            <Text style={styles.cardLabel}>Human Accuracy</Text>
            <Text style={[styles.cardValue, { color: COLORS.human }]}>
              {stats.humanAccuracy.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* ACCURACY PIE CHART */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Human vs Ensemble Accuracy</Text>
          <PieChart
            data={accuracyPieData}
            width={chartWidth}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
          />
          <View style={styles.accuracyBreakdown}>
            <Text style={styles.breakdownText}>
              ✓ Correct: {stats.humanVsEnsembleMatch} / {stats.totalScans}
            </Text>
            <Text style={styles.breakdownText}>
              ✗ Incorrect: {stats.totalScans - stats.humanVsEnsembleMatch} / {stats.totalScans}
            </Text>
          </View>
        </View>

        {/* MATCH COMPARISON - SIMPLIFIED CARDS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Agreement Between Classifiers</Text>
          <View style={styles.comparisonGrid}>
            <View style={styles.comparisonBox}>
              <Text style={styles.comparisonLabel}>Human ↔ Model 1</Text>
              <Text style={styles.comparisonValue}>{stats.humanModel1Match}</Text>
              <Text style={styles.comparisonPercent}>
                {((stats.humanModel1Match / stats.totalScans) * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.comparisonBox}>
              <Text style={styles.comparisonLabel}>Human ↔ Model 2</Text>
              <Text style={styles.comparisonValue}>{stats.humanModel2Match}</Text>
              <Text style={styles.comparisonPercent}>
                {((stats.humanModel2Match / stats.totalScans) * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.comparisonBox}>
              <Text style={styles.comparisonLabel}>Model 1 ↔ Model 2</Text>
              <Text style={styles.comparisonValue}>{stats.model1Model2Match}</Text>
              <Text style={styles.comparisonPercent}>
                {((stats.model1Model2Match / stats.totalScans) * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.comparisonBox}>
              <Text style={styles.comparisonLabel}>All Three Match</Text>
              <Text style={styles.comparisonValue}>{stats.allThreeMatch}</Text>
              <Text style={styles.comparisonPercent}>
                {((stats.allThreeMatch / stats.totalScans) * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        {/* CONFIDENCE SCORES - SIMPLE COMPARISON */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Average Model Confidence</Text>
          <View style={styles.confidenceRow}>
            <View style={styles.confidenceItem}>
              <Text style={styles.confidenceLabel}>Model 1</Text>
              <View style={styles.confidenceBarContainer}>
                <View
                  style={[
                    styles.confidenceBar,
                    {
                      width: `${stats.model1AvgConfidence}%`,
                      backgroundColor: COLORS.model1,
                    },
                  ]}
                />
              </View>
              <Text style={styles.confidenceValue}>
                {stats.model1AvgConfidence.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.confidenceItem}>
              <Text style={styles.confidenceLabel}>Model 2</Text>
              <View style={styles.confidenceBarContainer}>
                <View
                  style={[
                    styles.confidenceBar,
                    {
                      width: `${stats.model2AvgConfidence}%`,
                      backgroundColor: COLORS.model2,
                    },
                  ]}
                />
              </View>
              <Text style={styles.confidenceValue}>
                {stats.model2AvgConfidence.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* CLASSIFICATION BREAKDOWN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Classifications by Human</Text>
          {topHumanClassifications.map(([key, count]) => (
            <View key={key} style={styles.classificationRow}>
              <Text style={styles.classificationLabel}>
                {WASTE_TYPE_LABELS[key] || key}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(count / stats.totalScans) * 100}%`,
                      backgroundColor: COLORS.human,
                    },
                  ]}
                />
              </View>
              <Text style={styles.classificationCount}>{count}</Text>
            </View>
          ))}
        </View>

        {/* MODEL 1 BREAKDOWN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Classifications by Model 1</Text>
          {topModel1Classifications.map(([key, count]) => (
            <View key={key} style={styles.classificationRow}>
              <Text style={styles.classificationLabel}>
                {WASTE_TYPE_LABELS[key] || key}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(count / stats.totalScans) * 100}%`,
                      backgroundColor: COLORS.model1,
                    },
                  ]}
                />
              </View>
              <Text style={styles.classificationCount}>{count}</Text>
            </View>
          ))}
        </View>

        {/* MODEL 2 BREAKDOWN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Classifications by Model 2</Text>
          {topModel2Classifications.map(([key, count]) => (
            <View key={key} style={styles.classificationRow}>
              <Text style={styles.classificationLabel}>
                {WASTE_TYPE_LABELS[key] || key}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(count / stats.totalScans) * 100}%`,
                      backgroundColor: COLORS.model2,
                    },
                  ]}
                />
              </View>
              <Text style={styles.classificationCount}>{count}</Text>
            </View>
          ))}
        </View>

        {/* DETAILED STATISTICS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detailed Statistics</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Human ↔ Model 1 Agreement:</Text>
            <Text style={styles.statValue}>
              {stats.humanModel1Match} / {stats.totalScans} (
              {((stats.humanModel1Match / stats.totalScans) * 100).toFixed(1)}%)
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Human ↔ Model 2 Agreement:</Text>
            <Text style={styles.statValue}>
              {stats.humanModel2Match} / {stats.totalScans} (
              {((stats.humanModel2Match / stats.totalScans) * 100).toFixed(1)}%)
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Model 1 ↔ Model 2 Agreement:</Text>
            <Text style={styles.statValue}>
              {stats.model1Model2Match} / {stats.totalScans} (
              {((stats.model1Model2Match / stats.totalScans) * 100).toFixed(1)}%)
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>All Three Agree:</Text>
            <Text style={styles.statValue}>
              {stats.allThreeMatch} / {stats.totalScans} (
              {((stats.allThreeMatch / stats.totalScans) * 100).toFixed(1)}%)
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Model 1 Avg Confidence:</Text>
            <Text style={styles.statValue}>
              {stats.model1AvgConfidence.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Model 2 Avg Confidence:</Text>
            <Text style={styles.statValue}>
              {stats.model2AvgConfidence.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: { marginTop: 10, color: "#666", fontSize: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { fontSize: 16, color: "#999" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  backButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backButtonText: { color: "#fff", fontWeight: "700" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 18,
    color: "#333",
  },

  scrollContent: { padding: 12 },
  
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  cardSmall: { flex: 1, marginRight: 8 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#27ae60",
  },

  accuracyBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  breakdownText: {
    fontSize: 14,
    color: "#555",
    marginVertical: 4,
  },

  classificationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  classificationLabel: {
    flex: 1,
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  progressBar: {
    flex: 2,
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  classificationCount: {
    width: 30,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statLabel: {
    fontSize: 13,
    color: "#555",
    fontWeight: "600",
    flex: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#27ae60",
    textAlign: "right",
  },

  comparisonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  comparisonBox: {
    width: "48%",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
  },
  comparisonLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#27ae60",
  },
  comparisonPercent: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },

  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confidenceItem: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
  },
  confidenceLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  confidenceBarContainer: {
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  confidenceBar: { height: "100%" },
  confidenceValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#27ae60",
    textAlign: "right",
  },
  // Add to styles object:

  comparisonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  comparisonBox: {
    width: "48%",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.human,
    alignItems: "center",
  },
  comparisonLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  comparisonValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 2,
  },
  comparisonPercent: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.match,
  },

  confidenceRow: {
    flexDirection: "column",
  },
  confidenceItem: {
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
  },
  confidenceBarContainer: {
    height: 12,
    backgroundColor: "#eee",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
  },
  confidenceBar: {
    height: "100%",
    borderRadius: 6,
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#27ae60",
  },
});