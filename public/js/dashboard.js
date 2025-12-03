// js/dashboard.js
import { auth, db } from './firebaseInit.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Wait for auth state to load
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');

    if (userName) userName.textContent = user.displayName || user.email || 'User';
    if (userEmail) userEmail.textContent = user.email;

    // Display total items recycled and points (mirror mobile)
    await displayItemsRecycled(user.email);

    // Display recent scans
    await displayRecentScans(user.email);
  }
});

// Display total items recycled for the current user
async function displayItemsRecycled(email) {
  try {
    const scansColA = collection(db, 'scan');
    const scansColB = collection(db, 'scans');

    const [snapA, snapB] = await Promise.all([getDocs(scansColA), getDocs(scansColB)]);

    const docs = [
      ...snapA.docs.map(d => d.data()),
      ...snapB.docs.map(d => d.data())
    ].filter(d => d && d.email === email);

    const totalItems = docs.length;
    const totalPoints = docs.reduce((acc, d) => acc + (d.points || 10), 0);

    const itemsRecycledEl = document.getElementById('itemsRecycled');
    const pointsEarnedEl = document.getElementById('pointsEarned');

    if (itemsRecycledEl) itemsRecycledEl.textContent = totalItems;
    if (pointsEarnedEl) pointsEarnedEl.textContent = totalPoints;
  } catch (error) {
    console.error('Error fetching recycled items:', error);
  }
}

// Display recent scans (last 5)
async function displayRecentScans(email) {
  try {
    const scansCol = collection(db, 'scans');
    const q = query(scansCol, where('email', '==', email), orderBy('timestamp', 'desc'), limit(5));
    const scanSnapshot = await getDocs(q);

    const recentScansDiv = document.getElementById('recentScans');
    if (!recentScansDiv) return;

    recentScansDiv.innerHTML = ''; // Clear existing
    if (scanSnapshot.empty) {
      recentScansDiv.innerHTML = '<p>No recent scans.</p>';
      return;
    }

    scanSnapshot.forEach(doc => {
      const data = doc.data();
      const scanItem = document.createElement('div');
      scanItem.className = 'recent-scan-item';
      scanItem.innerHTML = `
        <img src="${data.imageUrl}" alt="Scan Image">
        <span>${new Date(data.timestamp).toLocaleString()}</span>
      `;
      recentScansDiv.appendChild(scanItem);
    });
  } catch (error) {
    console.error('Error fetching recent scans:', error);
  }
}
