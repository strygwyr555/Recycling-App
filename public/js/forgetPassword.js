// js/forgetPassword.js
import { auth } from './firebaseInit.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const resetEmail = document.getElementById('resetEmail').value;

  try {
    await sendPasswordResetEmail(auth, resetEmail);
    alert(`Password reset instructions have been sent to ${resetEmail}`);
  } catch (err) {
    console.error("Error sending reset email:", err);
    alert("Failed to send reset email. Please check the email address and try again.");
  }
});
