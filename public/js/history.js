// js/history.js
import { auth, db } from './firebaseInit.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

async function loadHistoryImages(userEmail) {
    const scansCol = collection(db, 'scans');
    const scanSnapshot = await getDocs(scansCol);
    let scanList = scanSnapshot.docs.map(doc => doc.data());
    // Filter scans by current user's email
    scanList = scanList.filter(scan => scan.email === userEmail);
    // Sort by timestamp descending
    scanList = scanList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const container = document.getElementById('historyGrid');
    container.innerHTML = '';

    if (scanList.length === 0) {
        container.innerHTML = '<p>No images found in history.</p>';
        return;
    }

    const columnDiv = document.createElement('div');
    columnDiv.className = 'history-column';

    scanList.forEach(scan => {
        if (scan.imageUrl) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'history-row';

            const img = document.createElement('img');
            img.src = scan.imageUrl;
            img.alt = 'Scan Image';
            img.className = 'history-image';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'classification-info';
            infoDiv.textContent = 'Classification info will appear here';

            rowDiv.appendChild(img);
            rowDiv.appendChild(infoDiv);
            columnDiv.appendChild(rowDiv);
        }
    });

    container.appendChild(columnDiv);
}

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadHistoryImages(user.email);
        } else {
            window.location.href = "login.html";
        }
    });

    // Attach logout button if exists (from sidebar.html)
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
