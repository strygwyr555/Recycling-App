// FILE: js/history.js
// Populates the #historyGrid with user scan history from localStorage

// DOM Elements
const historyGrid = document.getElementById('historyGrid');
const loadingIndicator = document.querySelector('.loading-indicator');
const noHistoryMessage = document.getElementById('noHistory');

// Get current user from localStorage
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

// Load scans from localStorage
function loadScans() {
  try {
    return JSON.parse(localStorage.getItem('scans')) || [];
  } catch {
    return [];
  }
}

// Format date for display
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Create history card element
function createHistoryCard(scan) {
  const card = document.createElement('div');
  card.className = 'history-card';
  
  card.innerHTML = `
    <div class="card-header">
      <h3>${scan.itemName.toUpperCase()}</h3>
      <span class="confidence">${scan.confidence}% confidence</span>
    </div>
    <div class="card-body">
      <p><strong>Bin:</strong> ${scan.binType}</p>
      <p><strong>Materials:</strong> ${scan.details}</p>
      <p><strong>Tip:</strong> ${scan.tip}</p>
      <p class="timestamp"><small>Scanned: ${formatDate(scan.timestamp)}</small></p>
    </div>
  `;
  
  return card;
}

// Load and display user's scan history
async function loadHistory() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    loadingIndicator.style.display = 'flex';
    
    const scans = loadScans()
      .filter(scan => scan.uid === user.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (scans.length === 0) {
      noHistoryMessage.style.display = 'block';
      return;
    }

    // Clear existing content
    historyGrid.innerHTML = '';
    
    // Add history cards
    scans.forEach(scan => {
      const card = createHistoryCard(scan);
      historyGrid.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading history:', error);
    noHistoryMessage.textContent = 'Error loading scan history. Please try again.';
    noHistoryMessage.style.display = 'block';
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

// Initialize history display
window.addEventListener('load', loadHistory);