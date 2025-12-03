// js/scan.js
import { auth, db } from './firebaseInit.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {
    ensembleClassify,
    getReasoningExplanation,
    getRecommendationColor,
    RECOMMENDATION_STRENGTH,
} from './ensembleClassifier.js';

// Update this with your ngrok public URL or local Flask URL
const API_URL = "https://hypernutritive-marley-untheoretically.ngrok-free.dev/predict"; // Change to your ngrok URL like "https://xxxx-xx-xxx-xxx-xx.ngrok.io/predict"

// Cloudinary config (same as mobile)
const CLOUDINARY_CLOUD = "dtmpkhm3z";
const UPLOAD_PRESET = "recycleApp";

const CLASS_NAMES = [
    "metal waste",
    "organic waste",
    "paper waste",
    "plastic waste",
    "battery waste",
    "white-glass",
    "trash",
    "green-glass",
    "E-waste",
    "clothing waste",
    "cardboard waste",
    "brown-glass"
];

let capturedImageData = null;
let userSelectedClass = null;

// Format classification name: "organic_waste" → "Organic Waste"
function formatLabel(label) {
    if (!label) return "Unknown";
    
    return label
        .replace(/_/g, " ")           // Replace underscores with spaces
        .replace(/-/g, " ")           // Replace hyphens with spaces
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

// Format strength: "VERY_HIGH" → "Very High"
function formatStrength(strength) {
    if (!strength) return "Unknown";
    
    return strength
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

// UI Elements
const cameraFeed = document.getElementById("cameraFeed");
const canvas = document.getElementById("photoCanvas");
const capturedImage = document.getElementById("capturedImage");

const cameraSection = document.getElementById("cameraSection");
const userSelectionCard = document.getElementById("userSelectionCard");
const resultsSection = document.getElementById("resultsSection");

const previewUserSelect = document.getElementById("previewUserSelect");
const previewResult = document.getElementById("previewResult");

const categoryGrid = document.getElementById("categoryGrid");
const confirmSelectionBtn = document.getElementById("confirmSelectionBtn");

// AI prediction elements
const model1Label = document.getElementById("model1Label");
const model1Confidence = document.getElementById("model1Confidence");
const model2Label = document.getElementById("model2Label");
const model2Confidence = document.getElementById("model2Confidence");
const agreementTag = document.getElementById("agreementTag");

// Final recommendation elements
const yourSelectionLabel = document.getElementById("yourSelectionLabel");
const finalPredictionLabel = document.getElementById("finalPredictionLabel");
const finalStrength = document.getElementById("finalStrength");
const finalReason = document.getElementById("finalReason");

const saveScanBtn = document.getElementById("saveScanBtn");

// Start camera
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraFeed.srcObject = stream;
}
startCamera();

// Capture photo
document.getElementById("capturePhoto").onclick = () => {
    const ctx = canvas.getContext("2d");
    canvas.width = 640;
    canvas.height = 480;
    ctx.drawImage(cameraFeed, 0, 0);

    capturedImageData = canvas.toDataURL("image/jpeg");
    capturedImage.src = capturedImageData;

    cameraSection.style.display = "none";
    capturedImage.style.display = "block";

    showUserSelection();
};

// Upload file
document.getElementById("uploadFileButton").onclick = () => {
    document.getElementById("uploadFileInput").click();
};

document.getElementById("uploadFileInput").addEventListener("change", e => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
        capturedImageData = reader.result;
        capturedImage.src = capturedImageData;

        cameraSection.style.display = "none";
        showUserSelection();
    };

    reader.readAsDataURL(file);
});

// Show human selection UI
function showUserSelection() {
    userSelectionCard.style.display = "block";
    previewUserSelect.src = capturedImageData;

    categoryGrid.innerHTML = "";
    userSelectedClass = null; // Reset selection

    CLASS_NAMES.forEach(name => {
        const btn = document.createElement("button");
        btn.className = "category-btn";
        
        // Format name: "paper waste" → "Paper Waste"
        btn.textContent = name
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

        btn.onclick = () => {
            // Remove selected class from all buttons
            document.querySelectorAll(".category-btn").forEach(b => {
                b.classList.remove("selected");
            });
            
            // Add selected class to clicked button
            btn.classList.add("selected");
            
            // Store the original name (lowercase with spaces)
            userSelectedClass = name;
            confirmSelectionBtn.style.display = "block";
        };

        categoryGrid.appendChild(btn);
    });
}

// Confirm selection → Call AI models
confirmSelectionBtn.onclick = async () => {
    userSelectionCard.style.display = "none";
    resultsSection.style.display = "block";

    previewResult.src = capturedImageData;
    yourSelectionLabel.textContent = formatLabel(userSelectedClass);

    // Show loading state
    model1Label.textContent = "Loading...";
    model1Confidence.textContent = "";
    model2Label.textContent = "Loading...";
    model2Confidence.textContent = "";
    finalPredictionLabel.textContent = "Loading...";
    finalStrength.textContent = "";
    finalReason.textContent = "";

    const result = await runAI();

    if (result.error) {
        model1Label.textContent = "Error";
        model2Label.textContent = "Error";
        finalPredictionLabel.textContent = "Error loading predictions";
        return;
    }

    // Store result globally
    aiResult = result;

    // Fill UI
    model1Label.textContent = result.mobilenet.prediction;
    model1Confidence.textContent = (result.mobilenet.confidence * 100).toFixed(1) + "%";

    model2Label.textContent = result.rexnet.prediction;
    model2Confidence.textContent = (result.rexnet.confidence * 100).toFixed(1) + "%";

    // Final recommendation
    ensembleResult = pickFinal(result);

    finalPredictionLabel.textContent = formatLabel(ensembleResult.finalSelection);
    finalStrength.textContent = formatStrength(ensembleResult.recommendationStrength);
    finalReason.textContent = ensembleResult.reasoningDisplay;

    // Update confidence bars
    document.getElementById("model1Fill").style.width = (aiResult.mobilenet.confidence * 100) + "%";
    document.getElementById("model1Fill").style.backgroundColor = "#3498db";
    document.getElementById("model2Fill").style.width = (aiResult.rexnet.confidence * 100) + "%";
    document.getElementById("model2Fill").style.backgroundColor = "#9c27b0";

    // Update strength bar
    let strengthWidth = 50;
    if (ensembleResult.recommendationStrength === "HIGH") strengthWidth = 100;
    else if (ensembleResult.recommendationStrength === "MODERATE") strengthWidth = 65;
    document.getElementById("strengthFill").style.width = strengthWidth + "%";

    // Update agreement indicators (✅ for agree, ❌ for disagree)
    document.getElementById("allAgreeIndicator").textContent = ensembleResult.allAgree ? "✅" : "❌";
    document.getElementById("aiConsensusIndicator").textContent = ensembleResult.aiConsensus ? "✅" : "❌";
    document.getElementById("humanAIIndicator").textContent = ensembleResult.humanAIAlignment ? "✅" : "❌";
};

// AI call
async function runAI() {
    try {
        console.log("Calling API at:", API_URL);
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: capturedImageData })
        });

        if (!res.ok) {
            throw new Error(`API error: ${res.status} ${res.statusText}`);
        }

        const result = await res.json();
        console.log("API Response:", result);
        return result;
    } catch (error) {
        console.error("AI prediction error:", error);
        alert("Error getting AI predictions: " + error.message);
        return {
            mobilenet: { prediction: "Error", confidence: 0 },
            rexnet: { prediction: "Error", confidence: 0 }
        };
    }
}

// Store global result for save function
let aiResult = null;
let ensembleResult = null;

// Ensemble logic - matching mobile format
function pickFinal(res) {
    const m1 = {
        prediction: res.mobilenet.prediction.replace(/\s+/g, "_").toLowerCase(),
        confidence: res.mobilenet.confidence,
    };
    const m2 = {
        prediction: res.rexnet.prediction.replace(/\s+/g, "_").toLowerCase(),
        confidence: res.rexnet.confidence,
    };
    const human = userSelectedClass.replace(/\s+/g, "_").toLowerCase();

    const ensemble = ensembleClassify({ model1: m1, model2: m2, human });

    // Map ensemble output to existing fields used elsewhere in this file
    return {
        finalSelection: ensemble.finalSelection,
        ensembleConfidence: ensemble.confidence,
        recommendationStrength:
            (ensemble.ensembleMetrics && ensemble.ensembleMetrics.recommendationStrength) || RECOMMENDATION_STRENGTH.LOW,
        ensembleReasoning: ensemble.reasoning,
        reasoningDisplay: getReasoningExplanation(ensemble.reasoning),
        aiConsensus: ensemble.ensembleMetrics ? ensemble.ensembleMetrics.aiConsensus : false,
        allAgree: ensemble.ensembleMetrics ? ensemble.ensembleMetrics.allAgree : false,
        humanAIAlignment: ensemble.ensembleMetrics ? ensemble.ensembleMetrics.humanAIAlignment : false,
        flags: ensemble.ensembleMetrics ? ensemble.ensembleMetrics.flags : [],
        m1Pred: m1.prediction,
        m2Pred: m2.prediction,
    };
}

// Save to Firestore - matching mobile format
saveScanBtn.onclick = async () => {
    try {
        const user = auth.currentUser;

        if (!user) {
            alert("Not authenticated. Please sign in.");
            return;
        }

        if (!aiResult || !ensembleResult) {
            alert("Please run AI analysis first.");
            return;
        }

        // Show saving state
        saveScanBtn.disabled = true;
        saveScanBtn.textContent = "Uploading...";

        // Upload image to Cloudinary
        let imageUrl = null;
        try {
            imageUrl = await uploadToCloudinary(capturedImageData);
            if (!imageUrl) throw new Error("Cloudinary upload failed");
        } catch (err) {
            console.error("Upload error:", err);
            alert("Failed to upload image: " + err.message);
            saveScanBtn.disabled = false;
            saveScanBtn.textContent = "Save Result";
            return;
        }

        // Convert class names to underscored format
        const userSelectionFormatted = userSelectedClass.replace(/\s+/g, "_").toLowerCase();

        const scanData = {
            email: user.email,
            uid: user.uid,
            timestamp: new Date(),
            imageUrl: imageUrl,  // Use Cloudinary URL instead of base64
            userSelection: userSelectionFormatted,
            results: {
                mobilenet: {
                    prediction: aiResult.mobilenet.prediction.replace(/\s+/g, "_").toLowerCase(),
                    confidence: aiResult.mobilenet.confidence
                },
                rexnet: {
                    prediction: aiResult.rexnet.prediction.replace(/\s+/g, "_").toLowerCase(),
                    confidence: aiResult.rexnet.confidence
                }
            },
            aiModel1Prediction: aiResult.mobilenet.prediction.replace(/\s+/g, "_").toLowerCase(),
            aiModel1Confidence: aiResult.mobilenet.confidence,
            aiModel2Prediction: aiResult.rexnet.prediction.replace(/\s+/g, "_").toLowerCase(),
            aiModel2Confidence: aiResult.rexnet.confidence,
            finalSelection: ensembleResult.finalSelection,
            ensembleConfidence: ensembleResult.ensembleConfidence,
            ensembleReasoning: ensembleResult.ensembleReasoning,
            ensembleMetrics: {
                allAgree: ensembleResult.allAgree,
                aiConsensus: ensembleResult.aiConsensus,
                humanAIAlignment: ensembleResult.humanAIAlignment,
                recommendationStrength: ensembleResult.recommendationStrength,
                flags: ensembleResult.flags
            }
        };

        await addDoc(collection(db, "scan"), scanData);
        alert("✅ Scan saved successfully!");
        
        // Reset UI
        saveScanBtn.disabled = false;
        saveScanBtn.textContent = "Save Result";
    } catch (error) {
        console.error("Error saving scan:", error);
        alert("Failed to save scan: " + error.message);
        saveScanBtn.disabled = false;
        saveScanBtn.textContent = "Save Result";
    }
};

// Upload to Cloudinary
async function uploadToCloudinary(base64Data) {
    try {
        const formData = new FormData();
        formData.append("file", base64Data);
        formData.append("upload_preset", UPLOAD_PRESET);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error(`Cloudinary error: ${response.status}`);
        }

        const data = await response.json();
        return data.secure_url || null;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw error;
    }
}
