import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD_bVwKKjEwM4fAnrniDg3y-x6DpbaATL0",
    authDomain: "recycling-ai-60514.firebaseapp.com",
    projectId: "recycling-ai-60514",
    storageBucket: "recycling-ai-60514.appspot.com",
    messagingSenderId: "116844452229",
    appId: "1:116844452229:web:63644296dc46d8c8140cec"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


async function loadHistoryImages(userEmail) {
    const scansCol = collection(db, 'scans');
    const scanSnapshot = await getDocs(scansCol);
    let scanList = scanSnapshot.docs.map(doc => doc.data());
    // Filter scans by current user's email
    scanList = scanList.filter(scan => scan.email === userEmail);
    // Sort by timestamp descending (most recent first)
    scanList = scanList.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    console.log('Loaded scan data:', scanList);
    const container = document.getElementById('historyGrid');
    container.innerHTML = '';
    let found = false;
    // Create a column layout for all items
    const columnDiv = document.createElement('div');
    columnDiv.className = 'history-column';
    scanList.forEach(scan => {
        if (scan.imageUrl) {
            found = true;
            // Row for image and classification info
            const rowDiv = document.createElement('div');
            rowDiv.className = 'history-row';

            // Image
            const img = document.createElement('img');
            img.src = scan.imageUrl;
            img.alt = 'Scan Image';
            img.className = 'history-image';

            // Classification info placeholder
            const infoDiv = document.createElement('div');
            infoDiv.className = 'classification-info';
            infoDiv.textContent = 'Classification info will appear here';

            rowDiv.appendChild(img);
            rowDiv.appendChild(infoDiv);
            columnDiv.appendChild(rowDiv);
        }
    });
    if (found) {
        container.appendChild(columnDiv);
    } else {
        container.innerHTML = '<p>No images found in history.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userEmail').textContent = user.email;
            loadHistoryImages(user.email);
        } else {
            // Redirect to login or show message
            window.location.href = 'login.html';
        }
    });
});
