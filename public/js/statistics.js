// js/statistics.js
import { auth, db } from './firebaseInit.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    await fetchStatistics(user.email);
  }
});

async function fetchStatistics(email) {
  try {
    const scansColA = collection(db, 'scan');
    const scansColB = collection(db, 'scans');

    const [snapA, snapB] = await Promise.all([getDocs(scansColA), getDocs(scansColB)]);

    const docs = [
      ...snapA.docs.map(d => d.data()),
      ...snapB.docs.map(d => d.data())
    ].filter(d => d && d.email === email);

    const totalScans = docs.length;
    const totalPoints = docs.reduce((acc, d) => acc + (d.points || 10), 0);

    // Update overview
    const totalScansEl = document.getElementById('totalScans');
    const totalPointsEl = document.getElementById('totalPoints');
    const impactMessageEl = document.getElementById('impactMessage');

    if (totalScansEl) totalScansEl.textContent = totalScans;
    if (totalPointsEl) totalPointsEl.textContent = totalPoints;
    if (impactMessageEl) {
      if (totalScans === 0) {
        impactMessageEl.textContent = 'By recycling scans, you\'ve helped reduce waste and protect our planet!';
      } else {
        impactMessageEl.textContent = `By recycling ${totalScans} items, you've helped reduce waste and protect our planet! Your contribution: ${totalPoints} environmental points`;
      }
    }

    // Build waste composition
    const itemTypes = {};
    docs.forEach(d => {
      // Try to get classification from multiple sources
      const classification = d.finalSelection || d.classification || d.result || 'Unknown';
      if (classification && classification !== 'Unknown') {
        itemTypes[classification] = (itemTypes[classification] || 0) + 1;
      }
    });

    const composition = Object.entries(itemTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    renderWasteComposition(composition, totalScans);

  } catch (error) {
    console.error('Error fetching statistics:', error);
  }
}

function getImpactEmoji(type) {
  const emojiMap = {
    'plastic': '🟦',
    'metal': '⬜',
    'paper': '📄',
    'battery': '🔋',
    'glass': '🟩',
    'automobile': '🚗',
    'organic': '🟫',
    'e-waste': '💻',
    'lightbulb': '💡',
  };

  // Normalize type name
  const normalized = type.toLowerCase().replace(/_/g, '-').replace(' ', '-');
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (normalized.includes(key)) return emoji;
  }
  return '♻️';
}

function renderWasteComposition(composition, totalScans) {
  const container = document.getElementById('wasteComposition');
  
  if (composition.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No scans yet. Start scanning to see your breakdown!</p>';
    return;
  }

  let html = '<div style="display: grid; gap: 12px;">';
  composition.forEach(item => {
    const percentage = totalScans > 0 ? ((item.count / totalScans) * 100).toFixed(0) : 0;
    const emoji = getImpactEmoji(item.type);
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
          <span style="font-size: 1.3rem;">${emoji}</span>
          <span style="font-weight: 600; color: #333;">${item.type}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; justify-content: flex-end;">
          <span style="font-weight: 700; color: #27ae60;">${item.count}</span>
          <div style="width: 80px; height: 6px; background: #eee; border-radius: 3px; overflow: hidden;">
            <div style="width: ${percentage}%; height: 100%; background: #27ae60; border-radius: 3px;"></div>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
}
