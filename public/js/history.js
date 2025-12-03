// js/history.js
import { auth, db } from "./firebaseInit.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

/* -------------------------------------------------------
   CLEAN LABEL → normalize names across mobile + web
------------------------------------------------------- */
function cleanLabel(label) {
    if (!label || typeof label !== "string") return "Unknown";

    let res = label
        .replace(/_/g, " ")              // Replace underscores with spaces
        .replace(/-/g, " ")              // Replace hyphens with spaces
        .replace(/\be\s+waste\b/gi, "E-Waste")    // "e waste" → "E-Waste"
        .replace(/\be\s*-\s*waste\b/gi, "E-Waste")  // "e-waste" → "E-Waste"
        .replace(/\bwhite\s+glass\b/gi, "White Glass")
        .replace(/\bgreen\s+glass\b/gi, "Green Glass")
        .replace(/\bbrown\s+glass\b/gi, "Brown Glass")
        .replace(/\bcardboard\s+waste\b/gi, "Cardboard Waste")
        .replace(/\bclothing\s+waste\b/gi, "Clothing Waste")
        .replace(/\bwaste\b/gi, "Waste")
        .replace(/\bglass\b/gi, "Glass")
        .replace(/\borganic\b/gi, "Organic")
        .replace(/\bbattery\b/gi, "Battery")
        .replace(/\bmetal\b/gi, "Metal")
        .replace(/\bpaper\b/gi, "Paper")
        .replace(/\bplastic\b/gi, "Plastic")
        .replace(/\btrash\b/gi, "Trash")
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase());

    // Fallback: sometimes stored label is a single letter like "E" — treat as E-Waste
    if (res === "E") return "E-Waste";

    return res;
}

/* -------------------------------------------------------
   DATE FORMATTER
------------------------------------------------------- */
function formatDate(ts) {
    if (!ts) return "Unknown";

    let date;

    // Case 1: Firestore Timestamp object (has 'seconds' property)
    if (typeof ts === "object" && ts.seconds) {
        date = new Date(ts.seconds * 1000);
    }
    // Case 2: Standard Date object
    else if (ts instanceof Date) {
        date = ts;
    }
    // Case 3: String (ISO or other format)
    else if (typeof ts === "string") {
        date = new Date(ts);
    }
    // Case 4: Milliseconds timestamp
    else if (typeof ts === "number") {
        date = new Date(ts);
    }
    else {
        return "Unknown";
    }

    if (isNaN(date.getTime())) return "Unknown";

    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* -------------------------------------------------------
   LOAD HISTORY FROM BOTH COLLECTIONS
------------------------------------------------------- */
async function loadHistory(email) {
    const grid = document.getElementById("historyGrid");
    grid.innerHTML = "<p>Loading...</p>";

    // Read both collections so mobile + web both show
    const scanCol = collection(db, "scan");
    const scansCol = collection(db, "scans");

    const snap1 = await getDocs(scanCol);
    const snap2 = await getDocs(scansCol);

    let scans = [
        ...snap1.docs.map(d => d.data()),
        ...snap2.docs.map(d => d.data())
    ];

    scans = scans
        .filter(s => s.email === email)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    grid.innerHTML = "";

    if (scans.length === 0) {
        grid.innerHTML = `
            <p class="no-history">
                No scans yet. Start scanning to see your history!
            </p>`;
        return;
    }

    scans.forEach(scan => {
        const img = scan.imageUrl || scan.image || null;

        // Final recommendation - try multiple possible fields
        const final = cleanLabel(
            scan.finalSelection ||
            scan.classification ||
            scan.result ||
            "Unknown"
        );

        // User selection
        const userSel = cleanLabel(scan.userSelection || "Unknown");

        // Model 1 prediction - check nested results object first
        let model1Pred = "Unknown";
        let model1Conf = "N/A";
        
        if (scan.results?.mobilenet?.prediction) {
            model1Pred = cleanLabel(scan.results.mobilenet.prediction);
            model1Conf = scan.results.mobilenet.confidence 
                ? (scan.results.mobilenet.confidence * 100).toFixed(0) + "%" 
                : "N/A";
        } else if (scan.aiModel1Prediction) {
            model1Pred = cleanLabel(scan.aiModel1Prediction);
            model1Conf = scan.aiModel1Confidence
                ? (scan.aiModel1Confidence * 100).toFixed(0) + "%"
                : "N/A";
        }

        // Model 2 prediction - check nested results object first
        let model2Pred = "Unknown";
        let model2Conf = "N/A";
        
        if (scan.results?.rexnet?.prediction) {
            model2Pred = cleanLabel(scan.results.rexnet.prediction);
            model2Conf = scan.results.rexnet.confidence 
                ? (scan.results.rexnet.confidence * 100).toFixed(0) + "%" 
                : "N/A";
        } else if (scan.aiModel2Prediction) {
            model2Pred = cleanLabel(scan.aiModel2Prediction);
            model2Conf = scan.aiModel2Confidence
                ? (scan.aiModel2Confidence * 100).toFixed(0) + "%"
                : "N/A";
        }

        // Recommendation strength
        const strength = scan.recommendationStrength || 
                        scan.ensembleMetrics?.recommendationStrength || 
                        "N/A";

        const card = document.createElement("div");
        card.className = "history-card";

        card.innerHTML = `
            ${img ? `<img src="${img}" class="history-image" alt="Scan">` : '<div class="history-image-placeholder">No Image</div>'}

            <div class="history-info">
                <p class="final-title">${final}</p>

                <p class="info-item"><strong>You:</strong> ${userSel}</p>

                <p class="info-item"><strong>Model 1:</strong> ${model1Pred} <span style="opacity:.7;">(${model1Conf})</span></p>

                <p class="info-item"><strong>Model 2:</strong> ${model2Pred} <span style="opacity:.7;">(${model2Conf})</span></p>

                <p class="info-item"><strong>Strength:</strong> ${strength}</p>

                <p class="info-item"><strong>Date:</strong> ${formatDate(scan.timestamp)}</p>
            </div>
        `;

        grid.appendChild(card);
    });
}

/* -------------------------------------------------------
   AUTH CHECK
------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, user => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        loadHistory(user.email);
    });
});
