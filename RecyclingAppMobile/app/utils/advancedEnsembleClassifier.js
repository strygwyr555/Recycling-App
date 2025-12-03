/**
 * ADVANCED ENSEMBLE CLASSIFIER v3
 * - Dynamic model accuracy from feedback
 * - Confidence capping by category difficulty
 * - Human dissent boost
 * - Visual sanity checks
 */

const WASTE_CATEGORIES = {
  metal_waste: { group: "metal", recyclable: true, difficulty: "easy" },
  organic_waste: { group: "organic", recyclable: false, difficulty: "easy" },
  paper_waste: { group: "paper", recyclable: true, difficulty: "easy" },
  plastic_waste: { group: "plastic", recyclable: true, difficulty: "medium" },
  battery_waste: { group: "battery", recyclable: true, difficulty: "hard" },
  white_glass: { group: "glass", recyclable: true, difficulty: "medium" },
  green_glass: { group: "glass", recyclable: true, difficulty: "medium" },
  brown_glass: { group: "glass", recyclable: true, difficulty: "medium" },
  cardboard_waste: { group: "paper", recyclable: true, difficulty: "easy" },
  clothing_waste: { group: "textile", recyclable: true, difficulty: "hard" },
  e_waste: { group: "electronics", recyclable: true, difficulty: "hard" },
  trash: { group: "trash", recyclable: false, difficulty: "easy" },
};

/**
 * DYNAMIC MODEL ACCURACY MATRIX
 * This will be populated from feedback data
 * Format: { categoryId: { mobilenet: { correct: 5, total: 8 }, rexnet: {...} } }
 */
let DYNAMIC_MODEL_ACCURACY = {};

/**
 * Initialize or update from Firestore feedback
 * Call this on app startup and periodically
 */
export const initializeDynamicAccuracy = async (feedbackData) => {
  DYNAMIC_MODEL_ACCURACY = {};
  
  feedbackData?.forEach(({ scanId, category, modelType, wasCorrect }) => {
    if (!category || !modelType) return;
    
    if (!DYNAMIC_MODEL_ACCURACY[category]) {
      DYNAMIC_MODEL_ACCURACY[category] = {};
    }
    if (!DYNAMIC_MODEL_ACCURACY[category][modelType]) {
      DYNAMIC_MODEL_ACCURACY[category][modelType] = { correct: 0, total: 0 };
    }
    
    DYNAMIC_MODEL_ACCURACY[category][modelType].total += 1;
    if (wasCorrect) {
      DYNAMIC_MODEL_ACCURACY[category][modelType].correct += 1;
    }
  });
};

// ============================================
// 1. CONFIDENCE CAPPING BY DIFFICULTY
// ============================================
const capConfidenceByDifficulty = (rawConfidence, prediction, modelType) => {
  const category = WASTE_CATEGORIES[prediction];
  if (!category) return rawConfidence;
  
  // Get dynamic accuracy if available, otherwise use defaults
  const modelAccuracy = DYNAMIC_MODEL_ACCURACY[prediction]?.[modelType];
  let baseAccuracy = 0.75;
  
  if (modelAccuracy) {
    baseAccuracy = modelAccuracy.total > 0 
      ? modelAccuracy.correct / modelAccuracy.total 
      : 0.75;
  }
  
  // Confidence cap based on difficulty
  const difficultyCapMap = {
    easy: 0.95,      // Easy items: can be very confident
    medium: 0.80,    // Medium: moderate confidence
    hard: 0.70,      // Hard: cap confidence to prevent overconfidence
  };
  
  const cap = difficultyCapMap[category.difficulty] || 0.75;
  
  // SANITY CHECK: If model is >90% confident on a HARD category, that's suspicious
  if (category.difficulty === "hard" && rawConfidence > 0.90) {
    // Apply aggressive penalty: sqrt to soften extreme confidence
    return Math.min(Math.sqrt(rawConfidence) * 0.7, cap);
  }
  
  // Normal calibration
  const calibrated = rawConfidence * baseAccuracy;
  
  return Math.min(calibrated, cap);
};

// ============================================
// 2. SIMILARITY SCORING
// ============================================
const calculateCategorySimilarity = (cat1, cat2) => {
  if (cat1 === cat2) return 1.0;
  
  const info1 = WASTE_CATEGORIES[cat1];
  const info2 = WASTE_CATEGORIES[cat2];
  
  if (!info1 || !info2) return 0;
  
  let similarity = 0;
  if (info1.group === info2.group) similarity += 0.7;
  if (info1.recyclable === info2.recyclable) similarity += 0.2;
  if (info1.difficulty === info2.difficulty) similarity += 0.1;
  
  return Math.min(similarity, 1.0);
};

// ============================================
// 3. CATEGORY-SPECIFIC HUMAN RELIABILITY
// ============================================
const getHumanReliabilityScore = (prediction) => {
  const category = WASTE_CATEGORIES[prediction];
  if (!category) return 0.5;
  
  // Humans excel at easy categories
  const baseReliability = {
    easy: 0.92,      // Very reliable on obvious items
    medium: 0.72,    // Moderate reliability
    hard: 0.45,      // Struggle with complex classifications
  }[category.difficulty];
  
  return baseReliability;
};

// ============================================
// 4. VISUAL SANITY CHECK
// ============================================
/**
 * Quick heuristic check: does prediction make visual sense?
 * Returns confidence boost/penalty
 */
const visualSanityCheck = (prediction, humanPrediction) => {
  /**
   * This is a lightweight check without computer vision
   * We use category properties to determine if prediction is "visually plausible"
   */
  
  const predCat = WASTE_CATEGORIES[prediction];
  const humanCat = WASTE_CATEGORIES[humanPrediction];
  
  if (!predCat || !humanCat) return 1.0;
  
  // If human picked EASY category and AI picked HARD category for same item
  // that's visually suspicious
  const difficultyJump = {
    easy_to_hard: 0.65,    // Unlikely: obvious item shouldn't be hard to classify
    easy_to_medium: 0.80,  // Possible but unlikely
    medium_to_hard: 0.85,  // Possible
    hard_to_easy: 1.1,     // Plausible: hard items can look simple
    medium_to_easy: 0.95,  // Slight penalty
  };
  
  const jump = `${humanCat.difficulty}_to_${predCat.difficulty}`;
  const sanityFactor = difficultyJump[jump] || 1.0;
  
  return sanityFactor;
};

// ============================================
// 5. BAYESIAN VOTING WITH EXPERTISE
// ============================================
const bayesianEnsembleVote = (human, model1, model2, model1Conf, model2Conf) => {
  const votes = {};
  
  // Human vote
  const humanWeight = getHumanReliabilityScore(human);
  votes[human] = humanWeight;
  
  // Model 1 vote (capped + sanity checked)
  const model1CappedConf = capConfidenceByDifficulty(model1Conf, model1, "mobilenet");
  const model1Sanity = visualSanityCheck(model1, human);
  votes[model1] = (votes[model1] || 0) + (model1CappedConf * model1Sanity * 0.40);
  
  // Model 2 vote (capped + sanity checked)
  const model2CappedConf = capConfidenceByDifficulty(model2Conf, model2, "rexnet");
  const model2Sanity = visualSanityCheck(model2, human);
  votes[model2] = (votes[model2] || 0) + (model2CappedConf * model2Sanity * 0.40);
  
  // Find winner
  const winner = Object.keys(votes).reduce((a, b) => 
    votes[a] > votes[b] ? a : b
  );
  
  const totalVoteWeight = humanWeight + 
    (model1CappedConf * model1Sanity * 0.40) + 
    (model2CappedConf * model2Sanity * 0.40);
  
  return {
    prediction: winner,
    voteScore: votes[winner],
    votes,
    confidence: totalVoteWeight > 0 ? votes[winner] / totalVoteWeight : 0.5,
  };
};

// ============================================
// 6. DISSENT BOOST FOR HUMAN
// ============================================
/**
 * Option 3: When human disagrees with BOTH models AND models disagree,
 * boost human's vote because they might see something AI missed
 */
const applyDissentBoost = (human, model1, model2) => {
  const allDifferent = (human !== model1) && (model1 !== model2) && (human !== model2);
  
  if (allDifferent) {
    // All three classifiers disagree = human gets credibility boost
    return 1.35; // 35% boost
  }
  
  const modelsAgree = model1 === model2;
  const humanAlone = human !== model1 && human !== model2;
  
  if (modelsAgree && humanAlone) {
    // Models agree, human alone = human gets modest boost
    // (because human might know something about difficulty)
    return 1.15; // 15% boost
  }
  
  return 1.0; // No boost
};

// ============================================
// 7. ADVANCED CONFLICT RESOLUTION
// ============================================
const resolveConflict = (human, model1, model2, model1Conf, model2Conf) => {
  const aiConsensus = model1 === model2;
  const humanDissents = human !== model1 && human !== model2;
  
  if (aiConsensus && humanDissents) {
    // Models agree, human disagrees
    const model1Capped = capConfidenceByDifficulty(model1Conf, model1, "mobilenet");
    const humanReliability = getHumanReliabilityScore(human);
    
    // Apply dissent boost
    const dissentBoost = applyDissentBoost(human, model1, model2);
    const boostedHumanReliability = humanReliability * dissentBoost;
    
    // Check if human's category makes visual sense
    const sanityFactor = visualSanityCheck(model1, human);
    const adjustedAIConfidence = model1Capped * sanityFactor;
    
    // Compare boosted human vs adjusted AI
    if (boostedHumanReliability > adjustedAIConfidence * 0.9) {
      // Human wins!
      return {
        finalSelection: human,
        reasoning: "HUMAN_DISSENT_PREVAILS",
        confidence: boostedHumanReliability,
        explanation: "Models agreed, but your judgment seems more reliable for this category.",
      };
    }
    
    // AI wins but respect human's dissent
    if (adjustedAIConfidence > 0.75) {
      return {
        finalSelection: model1,
        reasoning: "STRONG_AI_CONSENSUS_OVERRIDE",
        confidence: adjustedAIConfidence * 0.85, // Slight penalty for human disagreement
        explanation: "Models strongly agree, but consider reviewing.",
      };
    }
  }
  
  // All different: Bayesian voting
  return bayesianEnsembleVote(human, model1, model2, model1Conf, model2Conf);
};

// ============================================
// 8. UNCERTAINTY QUANTIFICATION
// ============================================
const quantifyUncertainty = (prediction, confidence, allVotes, difficulty) => {
  const thresholds = {
    easy: 0.75,
    medium: 0.65,
    hard: 0.55,
  };
  
  const threshold = thresholds[difficulty] || 0.65;
  const flags = [];
  
  if (confidence < threshold) {
    flags.push("BELOW_CONFIDENCE_THRESHOLD");
  }
  
  if (confidence < 0.5) {
    flags.push("CRITICAL_LOW_CONFIDENCE");
  }
  
  if (allVotes && Object.keys(allVotes).length === 3) {
    flags.push("HIGH_DISAGREEMENT");
  }
  
  return {
    uncertainty: 1 - confidence,
    flags,
    needsHumanReview: flags.includes("CRITICAL_LOW_CONFIDENCE") || 
                      (flags.includes("HIGH_DISAGREEMENT") && confidence < 0.55),
    confidenceThreshold: threshold,
  };
};

// ============================================
// 9. MAIN ENSEMBLE FUNCTION
// ============================================
export const advancedEnsembleClassify = ({
  human,
  model1,
  model2,
  model1Confidence = 0.5,
  model2Confidence = 0.5,
}) => {
  if (!human || !model1 || !model2) {
    return {
      finalSelection: human || model1 || model2 || "trash",
      confidence: 0.3,
      reasoning: "MISSING_PREDICTIONS",
      breakdown: { model1, model2, human },
      ensembleMetrics: {
        allAgree: false,
        aiConsensus: false,
        humanAIAlignment: false,
        recommendationStrength: "LOW",
        flags: ["MISSING_PREDICTIONS"],
        needsReview: true,
      },
    };
  }
  
  const difficulty = WASTE_CATEGORIES[human]?.difficulty || "medium";
  const allAgree = human === model1 && model1 === model2;
  const aiConsensus = model1 === model2;
  const humanAIAlignment = (human === model1) || (human === model2);
  
  let finalSelection, confidence, reasoning;
  
  if (allAgree) {
    // Unanimous agreement
    finalSelection = human;
    const model1Capped = capConfidenceByDifficulty(model1Confidence, model1, "mobilenet");
    const model2Capped = capConfidenceByDifficulty(model2Confidence, model2, "rexnet");
    confidence = Math.min((model1Capped + model2Capped) / 2 + 0.1, 1.0);
    reasoning = "UNANIMOUS_AGREEMENT";
  } else if (aiConsensus) {
    // Models agree, human may differ
    const result = resolveConflict(human, model1, model2, model1Confidence, model2Confidence);
    finalSelection = result.finalSelection;
    confidence = result.confidence;
    reasoning = result.reasoning;
  } else {
    // All different: Bayesian voting with dissent boost
    const result = bayesianEnsembleVote(human, model1, model2, model1Confidence, model2Confidence);
    finalSelection = result.prediction;
    confidence = result.confidence;
    reasoning = "WEIGHTED_VOTING_WITH_DISSENT_BOOST";
  }
  
  const uncertainty = quantifyUncertainty(finalSelection, confidence, {}, difficulty);
  
  let recommendationStrength = "LOW";
  if (confidence > 0.8) recommendationStrength = "HIGH";
  else if (confidence > 0.65) recommendationStrength = "MEDIUM";
  
  return {
    finalSelection,
    confidence: Math.min(Math.max(confidence, 0), 1.0),
    reasoning,
    breakdown: { model1, model2, human },
    ensembleMetrics: {
      allAgree,
      aiConsensus,
      humanAIAlignment,
      recommendationStrength,
      categoryDifficulty: difficulty,
      confidenceThreshold: uncertainty.confidenceThreshold,
      flags: uncertainty.flags,
      needsReview: uncertainty.needsHumanReview,
    },
  };
};

export default advancedEnsembleClassify;