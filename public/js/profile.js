// js/profile.js
import { auth, db } from './firebaseInit.js';
import { onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const firstNameEl = document.getElementById('firstName');
  const lastNameEl = document.getElementById('lastName');
  const usernameEl = document.getElementById('username');
  const emailEl = document.getElementById('email');
  const resetBtn = document.getElementById('resetPasswordBtn');

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    emailEl.textContent = user.email;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        firstNameEl.textContent = data.firstName || '';
        lastNameEl.textContent = data.lastName || '';
        usernameEl.textContent = data.username || '';
      } else {
        // fallback if Firestore doc is missing
        firstNameEl.textContent = '';
        lastNameEl.textContent = '';
        usernameEl.textContent = user.displayName || '';
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      firstNameEl.textContent = '';
      lastNameEl.textContent = '';
      usernameEl.textContent = user.displayName || '';
    }
  });

  // Reset password
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          await sendPasswordResetEmail(auth, user.email);
          alert(`Password reset email sent to ${user.email}`);
        } catch (err) {
          console.error("Error sending password reset:", err);
          alert("Failed to send reset email.");
        }
      }
    });
  }
});
