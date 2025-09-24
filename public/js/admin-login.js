document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  // TODO: Replace with real admin authentication logic
  if (email === 'damipop7@gmail.com' && password === '771240') {
    // Example: fetch center name from backend or localStorage
    localStorage.setItem('centerName', 'Green Recycling Center'); // Replace with dynamic value
    window.location.href = './admin.html';
  } else {
    alert('Invalid admin credentials');
  }
});