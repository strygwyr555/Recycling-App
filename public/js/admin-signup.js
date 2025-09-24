document.getElementById('adminSignupForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const centerName = document.getElementById('centerName').value;
  const adminEmail = document.getElementById('adminEmail').value;
  const adminPassword = document.getElementById('adminPassword').value;
  const centerLocation = document.getElementById('centerLocation').value;
  const centerType = document.getElementById('centerType').value;
  const adminCode = document.getElementById('adminCode').value;

  // Check admin verification code
  if (adminCode !== '771240') {
    alert('Invalid Admin Verification Code. Please contact the developers for a valid code.');
    return;
  }

  // Save details to localStorage for demo purposes
  localStorage.setItem('centerName', centerName);
  localStorage.setItem('adminEmail', adminEmail);
  localStorage.setItem('centerLocation', centerLocation); // Should be lat,lng for mapping
  localStorage.setItem('centerType', centerType);

  // Redirect to admin dashboard
  window.location.href = './admin.html';
});