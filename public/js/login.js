import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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
const db = getFirestore(app);

const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const identifier = document.getElementById('identifier').value.trim();
  const password = document.getElementById('password').value;

  let emailToUse = identifier;

  try {
    // If input is NOT an email, treat it as username
    if (!identifier.includes("@")) {
      const q = query(collection(db, "users"), where("username", "==", identifier));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("No account found with that username.");
        return;
      }

      // Get email linked to username
      querySnapshot.forEach((doc) => {
        emailToUse = doc.data().email;
      });
    }

    // Sign in with email + password
    await signInWithEmailAndPassword(auth, emailToUse, password);
    alert("Login successful!");
    window.location.href = "dashboard.html";

  } catch (error) {
    alert("Login failed: " + error.message);
  }
});
