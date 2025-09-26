import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore, collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD_bVwKKjEwM4fAnrniDg3y-x6DpbaATL0",
    authDomain: "recycling-ai-60514.firebaseapp.com",
    projectId: "recycling-ai-60514",
    storageBucket: "recycling-ai-60514.appspot.com",
    messagingSenderId: "116844452229",
    appId: "1:116844452229:web:63644296dc46d8c8140cec"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

class CameraHandler {
    constructor() {
        this.stream = null;
        this.video = document.getElementById('cameraFeed');
        this.canvas = document.getElementById('photoCanvas');
        this.capturedImage = document.getElementById('capturedImage');
        this.captureButton = document.getElementById('capturePhoto');
        this.retakeButton = document.getElementById('retakePhoto');
        this.classifyButton = document.getElementById('classifyButton');
        // File upload elements
        this.uploadFileInput = document.getElementById('uploadFileInput');
        this.uploadFileButton = document.getElementById('uploadFileButton');
        this.uploadedFile = null;
        // Initialize canvas dimensions
        this.canvas.width = 640;
        this.canvas.height = 480;
    }

    async initialize() {
        // Start camera automatically and show both buttons
        await this.startCamera();
        if (this.captureButton) {
            this.captureButton.style.display = 'block';
        }
        if (this.uploadFileButton) {
            this.uploadFileButton.style.display = 'block';
        }
        this.captureButton.addEventListener('click', () => this.captureImage());
        this.retakeButton.addEventListener('click', () => {
            this.retakePhoto();
            if (this.uploadFileButton) {
                this.uploadFileButton.style.display = 'block';
            }
            if (this.captureButton) {
                this.captureButton.style.display = 'block';
            }
        });
        this.classifyButton.addEventListener('click', () => this.saveImageToFirestore());
        // File upload events
        if (this.uploadFileButton && this.uploadFileInput) {
            this.uploadFileButton.addEventListener('click', () => {
                this.uploadFileInput.value = null; // Reset file input so 'change' always fires
                this.uploadFileInput.click();
                // Do NOT hide capture/upload buttons yet
            });
            this.uploadFileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e);
                // If no file selected, restore buttons immediately
                if (!e.target.files || !e.target.files.length) {
                    if (this.captureButton) this.captureButton.style.display = 'block';
                    if (this.uploadFileButton) this.uploadFileButton.style.display = 'block';
                }
            });
        }
    }

    async startCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        this.video.srcObject = this.stream;
        this.video.style.display = 'block';
        await new Promise((resolve) => {
            this.video.onloadedmetadata = resolve;
        });
        // Only show capture button, no reference to startButton
        if (this.captureButton) {
            this.captureButton.style.display = 'block';
        }
    }

    captureImage() {
        const context = this.canvas.getContext('2d');
        context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.capturedImage.src = this.canvas.toDataURL('image/jpeg');
        this.capturedImage.style.display = 'block';
        this.video.style.display = 'none';
        // Only show retake and classify buttons
        this.captureButton.style.display = 'none';
        if (this.uploadFileButton) this.uploadFileButton.style.display = 'none';
        this.retakeButton.style.display = 'block';
        this.classifyButton.style.display = 'block';
    }

    async saveImageToFirestore() {
        this.classifyButton.disabled = true;
        let cloudinaryUrl = null;
        try {
            if (this.uploadedFile) {
                cloudinaryUrl = await this.uploadFileToCloudinary(this.uploadedFile);
            } else {
                cloudinaryUrl = await this.uploadToCloudinary();
            }
        } catch (err) {
            this.showPopup('Image upload to Cloudinary failed.');
            return;
        }
        // Get current user email
        const user = auth.currentUser;
        const userEmail = user ? user.email : null;
        if (cloudinaryUrl) {
            try {
                await addDoc(collection(db, 'scans'), {
                    imageUrl: cloudinaryUrl,
                    timestamp: new Date().toISOString(),
                    email: userEmail
                });
                this.showPopup('Image saved successfully!');
                // Show classification display section with placeholder
                const classificationDisplay = document.getElementById('classificationDisplay');
                const classificationInfo = document.getElementById('classificationInfo');
                if (classificationDisplay && classificationInfo) {
                    classificationDisplay.style.display = 'block';
                    classificationInfo.textContent = 'No classification available.';
                }
                // Reset uploaded file after save
                this.uploadedFile = null;
            } catch (err) {
                this.showPopup('Could not save image to Firestore.');
            }
        } else {
            this.showPopup('No image URL returned from Cloudinary.');
        }
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.uploadedFile = file;
            // Preview the image
            const reader = new FileReader();
            reader.onload = (event) => {
                this.capturedImage.src = event.target.result;
                this.capturedImage.style.display = 'block';
                this.video.style.display = 'none';
                // Only show retake and classify buttons AFTER preview
                if (this.captureButton) this.captureButton.style.display = 'none';
                if (this.uploadFileButton) this.uploadFileButton.style.display = 'none';
                this.retakeButton.style.display = 'block';
                this.classifyButton.style.display = 'block';
                // Hide classification results section
                const classificationDisplay = document.getElementById('classificationDisplay');
                if (classificationDisplay) classificationDisplay.style.display = 'none';
            };
            reader.readAsDataURL(file);
        } else {
            // If no file selected (cancelled), restore capture and upload buttons
            if (this.captureButton) this.captureButton.style.display = 'block';
            if (this.uploadFileButton) this.uploadFileButton.style.display = 'block';
        }
    }

    async uploadFileToCloudinary(file) {
        const cloudName = 'dtmpkhm3z';
        const uploadPreset = 'recycleApp';
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.secure_url) {
                return data.secure_url;
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    retakePhoto() {
        this.capturedImage.style.display = 'none';
        this.video.style.display = 'block';
        this.retakeButton.style.display = 'none';
        this.classifyButton.style.display = 'none';
        this.classifyButton.disabled = false;
        // Also clear any event listeners or states that might keep classify visible
        setTimeout(() => {
            this.classifyButton.style.display = 'none';
        }, 0);
            // Hide classification results section
            const classificationDisplay = document.getElementById('classificationDisplay');
            if (classificationDisplay) classificationDisplay.style.display = 'none';
            // Show capture and upload buttons again
        this.captureButton.style.display = 'block';
        if (this.uploadFileButton) this.uploadFileButton.style.display = 'block';
    }

    async uploadToCloudinary() {
        const base64Image = this.canvas.toDataURL('image/jpeg');
        const cloudName = 'dtmpkhm3z';
        const uploadPreset = 'recycleApp';
        try {
            const formData = new FormData();
            formData.append('file', base64Image);
            formData.append('upload_preset', uploadPreset);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.secure_url) {
                return data.secure_url;
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    showPopup(message) {
        let popup = document.createElement('div');
        popup.className = 'popup-notification';
        popup.textContent = message;
        document.body.appendChild(popup);
        setTimeout(() => {
            popup.remove();
        }, 3000);
    }
}

// Initialize when DOM is loaded

document.addEventListener('DOMContentLoaded', async () => {
    const cameraHandler = new CameraHandler();
    await cameraHandler.initialize();
});

// Handle logout
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = "login.html";
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
    }

  // Display total items recycled from Firestore
  displayItemsRecycled();
});