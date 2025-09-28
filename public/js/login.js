// js/login.js
import { auth, db } from './firebaseInit.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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
    window.location.href = "dashboard.html";

  } catch (error) {
    alert("Login failed: " + error.message);
  }
});