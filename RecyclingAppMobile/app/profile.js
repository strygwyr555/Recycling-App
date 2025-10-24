// FILE: js/profile.js
// Simple localStorage-based profile loader (no Firebase)
const firstNameEl = document.getElementById("firstName");
const lastNameEl = document.getElementById("lastName");
const usernameEl = document.getElementById("username");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Load current user from localStorage
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function requireAuthOrRedirect() {
  const user = getCurrentUser();
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "login.html";
    return null;
  }
  return user;
}

function populateProfileFromUser(user) {
  if (!user) return;
  firstNameEl && (firstNameEl.textContent = user.firstName || "—");
  lastNameEl && (lastNameEl.textContent = user.lastName || "—");
  usernameEl && (usernameEl.textContent = user.username || "—");
}

const user = requireAuthOrRedirect();
if (user) populateProfileFromUser(user);

resetPasswordBtn?.addEventListener("click", () => {
  const user = getCurrentUser();
  if (!user || !user.email) {
    alert("No signed-in user with an email found.");
    return;
  }
  // Simulate reset: in a real app you'd integrate an email service
  alert("Password reset link simulated for " + user.email + ". Implement an email flow for production.");
});

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("user");
  if (typeof window !== "undefined") window.location.href = "login.html";
});