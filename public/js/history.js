// js/history.js
import { auth, db } from './firebaseInit.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Format readable date
function formatDate(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

async function loadHistoryImages(userEmail) {
  const scansCol = collection(db, 'scans');
  const scanSnapshot = await getDocs(scansCol);
  let scanList = scanSnapshot.docs.map(doc => doc.data());
  scanList = scanList.filter(scan => scan.email === userEmail);
  scanList = scanList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const container = document.getElementById('historyGrid');
  container.innerHTML = '';

  if (scanList.length === 0) {
    container.innerHTML = '<p class="no-history">No scans found yet. Try scanning or uploading an image!</p>';
    return;
  }

  scanList.forEach(scan => {
    if (scan.imageUrl) {
      const card = document.createElement('div');
      card.className = 'history-card';

      const img = document.createElement('img');
      img.src = scan.imageUrl;
      img.alt = 'Scan Image';
      img.className = 'history-image';

      const info = document.createElement('div');
      info.className = 'history-info';

      const classText = document.createElement('p');
      classText.innerHTML = `<strong>🧠 Classification:</strong> ${scan.classification || 'Unknown'}`;

      const confidenceText = document.createElement('p');
      confidenceText.innerHTML = `<strong>Confidence:</strong> ${
        scan.confidence ? (scan.confidence * 100).toFixed(1) + '%' : 'N/A'
      }`;

      const binText = document.createElement('p');
      binText.innerHTML = `<strong>📦 Bin:</strong> ${scan.bin || 'N/A'}`;

      const suggestionText = document.createElement('p');
      suggestionText.innerHTML = `<strong>💡 Suggestion:</strong> ${scan.suggestion || 'N/A'}`;

      const dateText = document.createElement('p');
      dateText.innerHTML = `<strong>📅 Date:</strong> ${formatDate(scan.timestamp)}`;

      info.appendChild(classText);
      info.appendChild(confidenceText);
      info.appendChild(binText);
      info.appendChild(suggestionText);
      info.appendChild(dateText);

      card.appendChild(img);
      card.appendChild(info);
      container.appendChild(card);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadHistoryImages(user.email);
    } else {
      window.location.href = "login.html";
    }
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = "login.html";
      } catch (err) {
        console.error("Logout failed:", err);
      }
    });
  }
});
