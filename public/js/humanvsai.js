// js/humanvsai.js
import { auth, db } from './firebaseInit.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    await fetchHumanVSAIStats(user.email);
  }
});

async function fetchHumanVSAIStats(email) {
  try {
    // Combine both collections (scan and scans) matching mobile behavior
    const [snapA, snapB] = await Promise.all([
      getDocs(collection(db, 'scan')),
      getDocs(collection(db, 'scans'))
    ]);

    const docs = [
      ...snapA.docs.map(d => d.data()),
      ...snapB.docs.map(d => d.data())
    ].filter(d => d && d.email === email);

    if (docs.length === 0) {
      document.getElementById('kpiGrid').parentElement.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No scans yet. Start scanning to see human vs AI analysis!</p>';
      return;
    }

    const totalScans = docs.length;

    // Helper: extract classification from doc (supports multiple shapes)
    const getClassification = (field) => (doc) => {
      if (!doc) return null;
      if (field === 'human') {
        return doc.userSelection || null;
      }
      if (field === 'model1') {
        return doc.aiModel1Prediction || doc.results?.mobilenet?.prediction || null;
      }
      if (field === 'model2') {
        return doc.aiModel2Prediction || doc.results?.rexnet?.prediction || null;
      }
      if (field === 'ensemble') {
        return doc.finalSelection || doc.classification || doc.result || null;
      }
      return null;
    };

    const getConfidence = (field) => (doc) => {
      if (field === 'model1') return doc.aiModel1Confidence || 0;
      if (field === 'model2') return doc.aiModel2Confidence || 0;
      return 0;
    };

    // Calculate match counts and classification breakdown
    let humanModel1Match = 0;
    let humanModel2Match = 0;
    let model1Model2Match = 0;
    let allThreeMatch = 0;
    let humanVsEnsembleMatch = 0;

    let humanClassCounts = {};
    let model1ClassCounts = {};
    let model2ClassCounts = {};

    let totalModel1Confidence = 0;
    let totalModel2Confidence = 0;

    let model1Correct = 0;
    let model2Correct = 0;

    docs.forEach(doc => {
      const human = getClassification('human')(doc);
      const model1 = getClassification('model1')(doc);
      const model2 = getClassification('model2')(doc);
      const ensemble = getClassification('ensemble')(doc);

      // Count classifications
      if (human) humanClassCounts[human] = (humanClassCounts[human] || 0) + 1;
      if (model1) model1ClassCounts[model1] = (model1ClassCounts[model1] || 0) + 1;
      if (model2) model2ClassCounts[model2] = (model2ClassCounts[model2] || 0) + 1;

      // Agreement matches
      if (human && model1 && human === model1) humanModel1Match++;
      if (human && model2 && human === model2) humanModel2Match++;
      if (model1 && model2 && model1 === model2) model1Model2Match++;
      if (human && model1 && model2 && human === model1 && model1 === model2) allThreeMatch++;
      if (human && ensemble && human === ensemble) humanVsEnsembleMatch++;

      // Model accuracy vs ensemble
      if (model1 && ensemble && model1 === ensemble) model1Correct++;
      if (model2 && ensemble && model2 === ensemble) model2Correct++;

      // Confidence
      totalModel1Confidence += getConfidence('model1')(doc);
      totalModel2Confidence += getConfidence('model2')(doc);
    });

    const humanAccuracy = (humanVsEnsembleMatch / totalScans) * 100;
    const model1Accuracy = (model1Correct / totalScans) * 100;
    const model2Accuracy = (model2Correct / totalScans) * 100;
    const model1AvgConfidence = (totalModel1Confidence / totalScans) * 100;
    const model2AvgConfidence = (totalModel2Confidence / totalScans) * 100;

    // Update overview cards
    document.getElementById('totalScans').textContent = totalScans;
    document.getElementById('humanAcc').textContent = humanAccuracy.toFixed(1) + '%';
    document.getElementById('model1Acc').textContent = model1Accuracy.toFixed(1) + '%';
    document.getElementById('model2Acc').textContent = model2Accuracy.toFixed(1) + '%';

    // Render pie chart for Human vs Ensemble
    renderPieChart(humanVsEnsembleMatch, totalScans - humanVsEnsembleMatch);

    // Update accuracy breakdown
    document.getElementById('correctCount').textContent = humanVsEnsembleMatch;
    document.getElementById('totalCount').textContent = totalScans;

    // Update agreement cards
    document.getElementById('humanOnly').textContent = humanModel1Match;
    document.getElementById('humanOnlyPct').textContent = ((humanModel1Match / totalScans) * 100).toFixed(1) + '%';
    document.getElementById('modelsAgree').textContent = model1Model2Match;
    document.getElementById('modelsAgreePct').textContent = ((model1Model2Match / totalScans) * 100).toFixed(1) + '%';
    document.getElementById('allAgree').textContent = allThreeMatch;
    document.getElementById('allAgreePct').textContent = ((allThreeMatch / totalScans) * 100).toFixed(1) + '%';

    // Render top classifications
    renderTopClassifications('humanClassifications', humanClassCounts, totalScans, '#e67e22');
    renderTopClassifications('model1Classifications', model1ClassCounts, totalScans, '#3498db');
    renderTopClassifications('model2Classifications', model2ClassCounts, totalScans, '#9c27b0');

    // Render confidence bars
    renderConfidenceBars(model1AvgConfidence, model2AvgConfidence);

    // Render detailed statistics table
    renderDetailedStats(humanModel1Match, humanModel2Match, model1Model2Match, allThreeMatch, model1AvgConfidence, model2AvgConfidence, totalScans);

    // Render insights
    let insightHTML = '<p style="margin-bottom: 0.8rem;"><strong>Analysis Summary:</strong><br>';
    insightHTML += `Human vs Ensemble Accuracy: <strong>${humanAccuracy.toFixed(1)}%</strong> (${humanVsEnsembleMatch}/${totalScans})<br>`;
    insightHTML += `Model 1 Accuracy: <strong>${model1Accuracy.toFixed(1)}%</strong><br>`;
    insightHTML += `Model 2 Accuracy: <strong>${model2Accuracy.toFixed(1)}%</strong><br>`;
    insightHTML += `All Three Agree: <strong>${allThreeMatch}</strong> (${((allThreeMatch / totalScans) * 100).toFixed(1)}%)</p>`;
    document.getElementById('insights').innerHTML = insightHTML;

  } catch (error) {
    console.error('Error fetching AI stats:', error);
    document.getElementById('insights').innerHTML = '<p style="color: #e74c3c;">Error loading statistics.</p>';
  }
}

function renderTopClassifications(elementId, classificationCounts, totalScans, color) {
  const container = document.getElementById(elementId);
  if (!container) return;

  const topItems = Object.entries(classificationCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (topItems.length === 0) {
    container.innerHTML = '<p style="color: #999;">No classifications yet.</p>';
    return;
  }

  let html = '';
  topItems.forEach(item => {
    const percent = ((item.count / totalScans) * 100).toFixed(0);
    html += `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 0.9rem; color: #333; font-weight: 600;">${item.type}</span>
          <span style="font-size: 0.85rem; color: #999;">${item.count}</span>
        </div>
        <div style="height: 8px; background: #eee; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; background: ${color}; width: ${percent}%; border-radius: 4px;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderConfidenceBars(model1Conf, model2Conf) {
  const container = document.getElementById('confidenceDisplay');
  if (!container) return;

  let html = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div>
        <div style="font-size: 0.9rem; color: #555; font-weight: 600; margin-bottom: 6px;">Model 1</div>
        <div style="height: 12px; background: #eee; border-radius: 6px; overflow: hidden; margin-bottom: 6px;">
          <div style="height: 100%; background: #3498db; width: ${model1Conf}%; border-radius: 6px;"></div>
        </div>
        <div style="font-size: 0.85rem; color: #27ae60; font-weight: 700;">${model1Conf.toFixed(1)}%</div>
      </div>
      <div>
        <div style="font-size: 0.9rem; color: #555; font-weight: 600; margin-bottom: 6px;">Model 2</div>
        <div style="height: 12px; background: #eee; border-radius: 6px; overflow: hidden; margin-bottom: 6px;">
          <div style="height: 100%; background: #9c27b0; width: ${model2Conf}%; border-radius: 6px;"></div>
        </div>
        <div style="font-size: 0.85rem; color: #27ae60; font-weight: 700;">${model2Conf.toFixed(1)}%</div>
      </div>
    </div>
  `;
  container.innerHTML = html;
}

function renderPieChart(correct, incorrect) {
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;

  // Destroy existing chart if it exists
  if (window.pieChartInstance) {
    window.pieChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  window.pieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['✓ Correct', '✗ Incorrect'],
      datasets: [{
        data: [correct, incorrect],
        backgroundColor: ['#27ae60', '#e74c3c'],
        borderColor: ['#fff', '#fff'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 15,
            font: { size: 12 }
          }
        }
      }
    }
  });
}

function renderDetailedStats(h_m1, h_m2, m1_m2, allThree, m1Conf, m2Conf, totalScans) {
  const tbody = document.getElementById('statsTableBody');
  if (!tbody) return;

  const stats = [
    { label: 'Human ↔ Model 1 Agreement', value: h_m1, pct: ((h_m1 / totalScans) * 100).toFixed(1) },
    { label: 'Human ↔ Model 2 Agreement', value: h_m2, pct: ((h_m2 / totalScans) * 100).toFixed(1) },
    { label: 'Model 1 ↔ Model 2 Agreement', value: m1_m2, pct: ((m1_m2 / totalScans) * 100).toFixed(1) },
    { label: 'All Three Agree', value: allThree, pct: ((allThree / totalScans) * 100).toFixed(1) },
    { label: 'Model 1 Avg Confidence', value: m1Conf.toFixed(1) + '%', pct: '' },
    { label: 'Model 2 Avg Confidence', value: m2Conf.toFixed(1) + '%', pct: '' }
  ];

  let html = '';
  stats.forEach(stat => {
    html += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; color: #333; font-weight: 600;">${stat.label}</td>
        <td style="padding: 12px; text-align: right; color: #27ae60; font-weight: 700;">${stat.value}${stat.pct ? ' (' + stat.pct + '%)' : ''}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}
