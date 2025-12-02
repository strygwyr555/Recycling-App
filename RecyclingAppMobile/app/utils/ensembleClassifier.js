/**
 * Confidence-Weighted Consensus Algorithm
 * Combines dual AI model predictions with human selection
 */

export const ENSEMBLE_REASONS = {
  ALL_AGREE: "ALL_AGREE",
  MODELS_AGREE_WITH_HUMAN: "MODELS_AGREE_WITH_HUMAN",
  MODELS_AGREE_OVERRIDE: "MODELS_AGREE_OVERRIDE",
  REXNET_STRONG_SIGNAL: "REXNET_STRONG_SIGNAL",
  HUMAN_CONSENSUS_TIE: "HUMAN_CONSENSUS_TIE",
  AMBIGUOUS_ALL_DIFFER: "AMBIGUOUS_ALL_DIFFER",
};

export const RECOMMENDATION_STRENGTH = {
  VERY_HIGH: "VERY_HIGH",
  HIGH: "HIGH",
  MODERATE: "MODERATE",
  LOW: "LOW",
};

/**
 * Main ensemble classification function
 * @param {Object} predictions - { model1, model2, human }
 * @returns {Object} Final classification with metadata
 */
export const ensembleClassify = (predictions) => {
  const { model1, model2, human } = predictions;

  // Validate inputs
  if (!model1 || !model2 || !human) {
    return createAmbiguousResult("Missing predictions", []);
  }

  const m1Pred = normalizeLabel(model1.prediction);
  const m2Pred = normalizeLabel(model2.prediction);
  const humanPred = normalizeLabel(human);

  const m1Conf = parseFloat(model1.confidence) || 0;
  const m2Conf = parseFloat(model2.confidence) || 0;

  // ===== SCENARIO 1: All three agree =====
  if (m1Pred === m2Pred && m2Pred === humanPred) {
    return createConsensusResult(
      humanPred,
      (m1Conf + m2Conf) / 2,
      ENSEMBLE_REASONS.ALL_AGREE,
      RECOMMENDATION_STRENGTH.VERY_HIGH,
      { model1, model2, human },
      []
    );
  }

  // ===== SCENARIO 2: Models agree, human differs =====
  if (m1Pred === m2Pred && m2Pred !== humanPred) {
    const avgConfidence = (m1Conf + m2Conf) / 2;
    const flags = ["HUMAN_DIFFERS_FROM_AI"];

    // High AI confidence → use AI (override)
    if (avgConfidence > 0.88) {
      flags.push("AI_OVERRIDE");
      return createConsensusResult(
        m1Pred,
        avgConfidence,
        ENSEMBLE_REASONS.MODELS_AGREE_OVERRIDE,
        RECOMMENDATION_STRENGTH.HIGH,
        { model1, model2, human },
        flags
      );
    }

    // Lower confidence → trust human
    flags.push("HUMAN_PREFERS");
    return createConsensusResult(
      humanPred,
      0.7,
      ENSEMBLE_REASONS.MODELS_AGREE_WITH_HUMAN,
      RECOMMENDATION_STRENGTH.MODERATE,
      { model1, model2, human },
      flags
    );
  }

  // ===== SCENARIO 3: Models disagree =====
  const m1Weighted = m1Conf * 0.45; // MobileNet weight
  const m2Weighted = m2Conf * 0.55; // ReXNet weight (more accurate)

  const flags = ["MODELS_CONFLICT"];

  // Check if either weighted model matches human
  if (m1Weighted > m2Weighted && m1Pred === humanPred) {
    return createConsensusResult(
      humanPred,
      Math.max(m1Conf, 0.65),
      ENSEMBLE_REASONS.MODELS_AGREE_WITH_HUMAN,
      RECOMMENDATION_STRENGTH.HIGH,
      { model1, model2, human },
      flags
    );
  }

  if (m2Weighted > m1Weighted && m2Pred === humanPred) {
    return createConsensusResult(
      humanPred,
      Math.max(m2Conf, 0.7),
      ENSEMBLE_REASONS.MODELS_AGREE_WITH_HUMAN,
      RECOMMENDATION_STRENGTH.HIGH,
      { model1, model2, human },
      flags
    );
  }

  // ReXNet has strong signal (>0.15 margin)
  if (m2Weighted - m1Weighted > 0.15) {
    flags.push("REXNET_STRONG");
    return createConsensusResult(
      m2Pred,
      m2Conf,
      ENSEMBLE_REASONS.REXNET_STRONG_SIGNAL,
      RECOMMENDATION_STRENGTH.MODERATE,
      { model1, model2, human },
      flags
    );
  }

  // MobileNet has strong signal
  if (m1Weighted - m2Weighted > 0.15) {
    flags.push("MOBILENET_STRONG");
    return createConsensusResult(
      m1Pred,
      m1Conf,
      ENSEMBLE_REASONS.HUMAN_CONSENSUS_TIE,
      RECOMMENDATION_STRENGTH.MODERATE,
      { model1, model2, human },
      flags
    );
  }

  // Tie → default to human judgment
  flags.push("TIE_DEFAULT_HUMAN");
  return createConsensusResult(
    humanPred,
    0.65,
    ENSEMBLE_REASONS.HUMAN_CONSENSUS_TIE,
    RECOMMENDATION_STRENGTH.MODERATE,
    { model1, model2, human },
    flags
  );
};

// ===== HELPER: Create consensus result =====
const createConsensusResult = (
  finalSelection,
  confidence,
  reason,
  strength,
  breakdown,
  flags
) => {
  return {
    finalSelection,
    confidence: Math.min(Math.max(confidence, 0), 1),
    reasoning: reason,
    ensembleMetrics: {
      allAgree: breakdown.model1.prediction === breakdown.model2.prediction && 
                breakdown.model2.prediction === breakdown.human,
      aiConsensus: breakdown.model1.prediction === breakdown.model2.prediction,
      humanAIAlignment: 
        breakdown.human === breakdown.model1.prediction ||
        breakdown.human === breakdown.model2.prediction,
      recommendationStrength: strength,
      flags,
    },
    breakdown: {
      model1: breakdown.model1,
      model2: breakdown.model2,
      human: breakdown.human,
    },
  };
};

// ===== HELPER: Create ambiguous result =====
const createAmbiguousResult = (reason, flags) => {
  return {
    finalSelection: null,
    confidence: 0,
    reasoning: ENSEMBLE_REASONS.AMBIGUOUS_ALL_DIFFER,
    ensembleMetrics: {
      allAgree: false,
      aiConsensus: false,
      humanAIAlignment: false,
      recommendationStrength: RECOMMENDATION_STRENGTH.LOW,
      flags: [...flags, "AMBIGUOUS_CLASSIFICATION"],
    },
    breakdown: {
      model1: null,
      model2: null,
      human: null,
    },
    error: reason,
  };
};

// ===== HELPER: Normalize waste type labels =====
const normalizeLabel = (label) => {
  if (!label) return null;
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/waste|wastes/gi, "")
    .trim();
};

// ===== HELPER: Get reasoning explanation =====
export const getReasoningExplanation = (reason) => {
  const explanations = {
    [ENSEMBLE_REASONS.ALL_AGREE]:
      "✅ All three (you + 2 AI models) agree on this classification.",
    [ENSEMBLE_REASONS.MODELS_AGREE_WITH_HUMAN]:
      "✓ AI models support your selection.",
    [ENSEMBLE_REASONS.MODELS_AGREE_OVERRIDE]:
      "🤖 Both AI models strongly agree (high confidence override).",
    [ENSEMBLE_REASONS.REXNET_STRONG_SIGNAL]:
      "📊 ReXNet (advanced model) has strong confidence on this classification.",
    [ENSEMBLE_REASONS.HUMAN_CONSENSUS_TIE]:
      "👤 AI models disagreed, so your judgment is used.",
    [ENSEMBLE_REASONS.AMBIGUOUS_ALL_DIFFER]:
      "⚠️ All three predictions differ - manual review recommended.",
  };
  return explanations[reason] || "Unknown reasoning";
};

// ===== HELPER: Get recommendation color =====
export const getRecommendationColor = (strength) => {
  const colors = {
    [RECOMMENDATION_STRENGTH.VERY_HIGH]: "#27ae60", // Green
    [RECOMMENDATION_STRENGTH.HIGH]: "#2ecc71", // Light green
    [RECOMMENDATION_STRENGTH.MODERATE]: "#f39c12", // Orange
    [RECOMMENDATION_STRENGTH.LOW]: "#e74c3c", // Red
  };
  return colors[strength] || "#95a5a6";
};