import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

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

async function loadHistoryImages() {
    const scansCol = collection(db, 'scans');
    const scanSnapshot = await getDocs(scansCol);
    const scanList = scanSnapshot.docs.map(doc => doc.data());
    console.log('Loaded scan data:', scanList);
    const container = document.getElementById('historyGrid');
    container.innerHTML = '';
    let found = false;
    scanList.forEach(scan => {
        if (scan.imageUrl) {
            found = true;
            const img = document.createElement('img');
            img.src = scan.imageUrl;
            img.alt = 'Scan Image';
            img.className = 'history-image';
            container.appendChild(img);
        }
    });
    if (!found) {
        container.innerHTML = '<p>No images found in history.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadHistoryImages);
