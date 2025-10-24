// FILE: js/signup.js
// Handles client-side sign up: validation, create auth user, write profile doc in Firestore


import { auth, db } from './firebaseInit.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';


const signupForm = document.getElementById('signupForm');
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");


function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem("users")) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}


signupForm?.addEventListener('submit', async (e) => {
e.preventDefault();


const firstName = firstNameInput?.value?.trim() || "";
const lastName = lastNameInput?.value?.trim() || "";
const username = usernameInput?.value?.trim() || "";
const email = emailInput?.value?.trim();
const password = passwordInput?.value;


if (!firstName || !lastName || !username || !email || !password) {
alert('Please fill out all required fields.');
return;
}


if (password !== confirmPassword) {
alert('Passwords do not match.');
return;
}


try {
const cred = await createUserWithEmailAndPassword(auth, email, password);
const user = cred.user;


// Create a user profile document in Firestore
const userDocRef = doc(db, 'users', user.uid);
await setDoc(userDocRef, {
firstName,
lastName,
username,
email,
createdAt: serverTimestamp(),
});


// Redirect to login or to app home
window.location.href = 'login.html';
} catch (err) {
console.error('Signup error:', err);
// Friendly message
alert(err.message || 'Failed to create account.');
}
});