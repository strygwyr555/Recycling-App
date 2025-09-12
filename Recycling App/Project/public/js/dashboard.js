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

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    // Update user info in dashboard
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    if (userName) userName.textContent = user.displayName || 'User';
    if (userEmail) userEmail.textContent = user.email;
  }
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

// Stats handling functions

// Fetch total images from Firestore and display
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
const db = getFirestore(app);


async function displayItemsRecycled() {
  try {
    const scansCol = collection(db, 'scans');
    const scanSnapshot = await getDocs(scansCol);
    // Get current user
    const user = auth.currentUser;
    const userEmail = user ? user.email : null;
    // Filter scans by user email
    const userImages = scanSnapshot.docs.filter(doc => doc.data().email === userEmail).length;
    const itemsRecycled = document.getElementById('itemsRecycled');
    if (itemsRecycled) itemsRecycled.textContent = userImages;
  } catch (error) {
    console.error('Error fetching recycled items:', error);
  }
}

window.logout = function () {
  signOut(auth).then(() => {
    alert("Logged out.");
    window.location.href = "login.html";
  });
};

