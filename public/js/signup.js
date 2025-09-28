import { auth, db } from "./firebaseInit.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // ✅ Check if passwords match
  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  try {
    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ✅ Set displayName in Firebase Auth profile
    await updateProfile(user, {
      displayName: username
    });

    // ✅ Save extra user info in Firestore
    await setDoc(doc(db, "users", user.uid), {
      firstName,
      lastName,
      username,
      email
    });

    alert("Signup successful!");
    window.location.href = "dashboard.html";
  } catch (error) {
    alert("Error: " + error.message);
  }
});
