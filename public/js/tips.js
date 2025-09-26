import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_bVwKKjEwM4fAnrniDg3y-x6DpbaATL0",
  authDomain: "recycling-ai-60514.firebaseapp.com",
  projectId: "recycling-ai-60514",
  storageBucket: "recycling-ai-60514.firebasestorage.app",
  messagingSenderId: "116844452229",    
  appId: "1:116844452229:web:63644296dc46d8c8140cec",
  measurementId: "G-NFE9GEK0Q6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    initializeCommonFeatures();

    // Add smooth scroll for tip items
    document.querySelectorAll('.material-item').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.add('highlight');
            setTimeout(() => item.classList.remove('highlight'), 1000);
        });
    });

    // Add hover animations
    const materialItems = document.querySelectorAll('.material-item');
    materialItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateY(-5px)';
        });

        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateY(0)';
        });
    });
});

// Handle logout
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = "login.html";
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
    }

  // Display total items recycled from Firestore
  displayItemsRecycled();
});