// FILE: js/scan.js
// Handles camera capture, image upload, and AI classification for recyclable items

// DOM Elements
const cameraFeed = document.getElementById('cameraFeed');
const photoCanvas = document.getElementById('photoCanvas');
const capturedImage = document.getElementById('capturedImage');
const capturePhotoBtn = document.getElementById('capturePhoto');
const retakePhotoBtn = document.getElementById('retakePhoto');
const classifyButton = document.getElementById('classifyButton');
const uploadFileInput = document.getElementById('uploadFileInput');
const uploadFileButton = document.getElementById('uploadFileButton');
const cameraError = document.getElementById('cameraError');
const loadingIndicator = document.querySelector('.loading-indicator');
const resultContainer = document.getElementById('result');
const classificationDisplay = document.getElementById('classificationDisplay');
const confidenceMeter = document.getElementById('confidenceMeter');

let stream = null;
let currentImageData = null;
let currentUser = getCurrentUser();

// Recycling database with materials and disposal instructions
const recyclingDatabase = {
  plastic: {
    binType: 'Blue Bin',
    materials: ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS'],
    tip: 'Rinse plastic containers before recycling. Remove lids and caps.',
    icon: '♻️'
  },
  paper: {
    binType: 'Green Bin',
    materials: ['Cardboard', 'Newspaper', 'Magazine', 'Paper'],
    tip: 'Keep paper dry and separate from wet waste. Flatten cardboard boxes.',
    icon: '📰'
  },
  glass: {
    binType: 'Clear Bin',
    materials: ['Glass', 'Bottles', 'Jars'],
    tip: 'Remove lids and rinse glass containers. Separate by color if required.',
    icon: '🥃'
  },
  metal: {
    binType: 'Gray Bin',
    materials: ['Aluminum', 'Steel', 'Tin'],
    tip: 'Crush aluminum cans to save space. Remove labels from metal containers.',
    icon: '🔩'
  },
  organic: {
    binType: 'Brown Bin',
    materials: ['Food Waste', 'Leaves', 'Compostable'],
    tip: 'Keep organic waste separate. Do not include meat or dairy in some regions.',
    icon: '🌱'
  },
  electronics: {
    binType: 'E-Waste Center',
    materials: ['Electronics', 'Batteries', 'Devices'],
    tip: 'Take electronics to specialized recycling centers. Never throw in regular bins.',
    icon: '🔌'
  },
  nonrecyclable: {
    binType: 'Trash Bin',
    materials: ['Non-recyclable'],
    tip: 'This item cannot be recycled. Please dispose in regular trash.',
    icon: '🗑️'
  }
};

// Load scans from localStorage
function loadScans() {
  try {
    return JSON.parse(localStorage.getItem('scans')) || [];
  } catch {
    return [];
  }
}

// Save scan to localStorage
function saveScan(scan) {
  const scans = loadScans();
  scans.push(scan);
  localStorage.setItem('scans', JSON.stringify(scans));
}

// Save scan result locally
async function saveScanToDatabase(result) {
  try {
    const info = recyclingDatabase[result.category];
    const scan = {
      uid: currentUser.id,
      itemName: result.category,
      details: info.materials.join(', '),
      binType: info.binType,
      tip: info.tip,
      confidence: result.confidence,
      timestamp: new Date().toISOString()
    };
    saveScan(scan);
    console.log('Scan saved successfully');
  } catch (err) {
    console.error('Error saving scan:', err);
  }
}

// Get current user from localStorage
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

// Auth check
const user = getCurrentUser();
if (!user) {
  window.location.href = "login.html";
}

// Initialize camera on page load
async function initCamera() {
  try {
    loadingIndicator.style.display = 'flex';
    
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraFeed.srcObject = stream;
    
    cameraFeed.onloadedmetadata = () => {
      loadingIndicator.style.display = 'none';
      capturePhotoBtn.style.display = 'inline-flex';
    };

    cameraError.style.display = 'none';
  } catch (err) {
    console.error('Camera error:', err);
    loadingIndicator.style.display = 'none';
    cameraError.querySelector('p').textContent = 
      'Unable to access camera. Please check permissions or upload an image instead.';
    cameraError.style.display = 'flex';
    uploadFileButton.style.display = 'inline-flex';
  }
}

// Capture photo from camera feed
capturePhotoBtn.addEventListener('click', () => {
  const context = photoCanvas.getContext('2d');
  photoCanvas.width = cameraFeed.videoWidth;
  photoCanvas.height = cameraFeed.videoHeight;
  
  context.drawImage(cameraFeed, 0, 0);
  currentImageData = photoCanvas.toDataURL('image/jpeg');
  
  capturedImage.src = currentImageData;
  capturedImage.style.display = 'block';
  cameraFeed.style.display = 'none';
  
  capturePhotoBtn.style.display = 'none';
  retakePhotoBtn.style.display = 'inline-flex';
  classifyButton.style.display = 'inline-flex';
});

// Retake photo
retakePhotoBtn.addEventListener('click', () => {
  cameraFeed.style.display = 'block';
  capturedImage.style.display = 'none';
  retakePhotoBtn.style.display = 'none';
  classifyButton.style.display = 'none';
  capturePhotoBtn.style.display = 'inline-flex';
  resultContainer.style.display = 'none';
  classificationDisplay.style.display = 'none';
});

// Upload file from PC
uploadFileButton.addEventListener('click', () => {
  uploadFileInput.click();
});

uploadFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    currentImageData = event.target.result;
    capturedImage.src = currentImageData;
    capturedImage.style.display = 'block';
    cameraFeed.style.display = 'none';
    
    capturePhotoBtn.style.display = 'none';
    retakePhotoBtn.style.display = 'inline-flex';
    classifyButton.style.display = 'inline-flex';
    resultContainer.style.display = 'none';
  };
  reader.readAsDataURL(file);
});

// Classify image using TensorFlow.js
classifyButton.addEventListener('click', async () => {
  if (!currentImageData) {
    alert('Please capture or upload an image first.');
    return;
  }

  try {
    confidenceMeter.style.display = 'block';
    classifyButton.disabled = true;
    
    // Load and prepare image
    const img = new Image();
    img.onload = async () => {
      // Simple classification based on image analysis
      const result = await classifyImage(img);
      displayResult(result);
      
      // Save scan to Firestore if user is logged in
      if (currentUser) {
        await saveScanToDatabase(result);
      }
      
      classifyButton.disabled = false;
    };
    img.src = currentImageData;
  } catch (err) {
    console.error('Classification error:', err);
    alert('Error classifying image. Please try again.');
    classifyButton.disabled = false;
  }
});

// Simple image classification logic
async function classifyImage(img) {
  // Create canvas and get image data
  const canvas = document.createElement('canvas');
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 224, 224);
  
  const imageData = ctx.getImageData(0, 0, 224, 224);
  const data = imageData.data;
  
  // Analyze color distribution (simplified classification)
  let redCount = 0, greenCount = 0, blueCount = 0, grayCount = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
      grayCount++;
    } else if (r > g && r > b) {
      redCount++;
    } else if (g > r && g > b) {
      greenCount++;
    } else if (b > r && b > g) {
      blueCount++;
    }
  }
  
  // Determine category based on color analysis
  const total = redCount + greenCount + blueCount + grayCount;
  let category = 'nonrecyclable';
  let confidence = 0;
  
  if (grayCount > total * 0.4) {
    category = 'metal';
    confidence = 75;
  } else if (blueCount > total * 0.3) {
    category = 'glass';
    confidence = 72;
  } else if (greenCount > total * 0.3) {
    category = 'organic';
    confidence = 70;
  } else if (redCount > total * 0.3) {
    category = 'plastic';
    confidence = 68;
  } else {
    category = 'paper';
    confidence = 65;
  }
  
  return {
    category,
    confidence,
    timestamp: new Date().toLocaleString()
  };
}

// Display classification result
function displayResult(result) {
  const info = recyclingDatabase[result.category];
  
  document.getElementById('classificationResult').innerHTML = `
    <div class="result-content">
      <div class="category-badge">${info.icon} ${result.category.toUpperCase()}</div>
      <p class="confidence-score">Confidence: ${result.confidence}%</p>
    </div>
  `;
  
  document.getElementById('binType').textContent = `Bin Type: ${info.binType}`;
  document.getElementById('materialType').textContent = `Materials: ${info.materials.join(', ')}`;
  document.getElementById('recyclingTip').textContent = `Tip: ${info.tip}`;
  
  // Update confidence meter
  const confidenceFill = document.querySelector('.confidence-fill');
  const confidenceText = document.querySelector('.confidence-text');
  confidenceFill.style.width = result.confidence + '%';
  confidenceText.textContent = result.confidence + '% confidence';
  
  resultContainer.style.display = 'block';
  classificationDisplay.style.display = 'block';
  
  document.getElementById('classificationInfo').innerHTML = `
    <div class="info-box">
      <h4>Category: ${result.category.toUpperCase()}</h4>
      <p><strong>Bin Type:</strong> ${info.binType}</p>
      <p><strong>Materials:</strong> ${info.materials.join(', ')}</p>
      <p><strong>Instructions:</strong> ${info.tip}</p>
      <p><strong>Scanned At:</strong> ${result.timestamp}</p>
    </div>
  `;
}

// Initialize camera on load
window.addEventListener('load', initCamera);