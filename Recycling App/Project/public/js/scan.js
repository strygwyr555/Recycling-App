import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore, collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

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
        this.startButton = document.getElementById('startCamera');
        this.captureButton = document.getElementById('capturePhoto');
        this.retakeButton = document.getElementById('retakePhoto');
        this.classifyButton = document.getElementById('classifyButton');
        // Initialize canvas dimensions
        this.canvas.width = 640;
        this.canvas.height = 480;
    }

    async initialize() {
        this.startButton.addEventListener('click', () => this.startCamera());
        this.captureButton.addEventListener('click', () => this.captureImage());
        this.retakeButton.addEventListener('click', () => this.retakePhoto());
        this.classifyButton.addEventListener('click', () => this.saveImageToFirestore());
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
        this.startButton.style.display = 'none';
        this.captureButton.style.display = 'block';
    }

    captureImage() {
        const context = this.canvas.getContext('2d');
        context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.capturedImage.src = this.canvas.toDataURL('image/jpeg');
        this.capturedImage.style.display = 'block';
        this.video.style.display = 'none';
        this.captureButton.style.display = 'none';
        this.retakeButton.style.display = 'block';
        this.classifyButton.style.display = 'block';
    }

    async saveImageToFirestore() {
        this.classifyButton.disabled = true;
        let cloudinaryUrl = null;
        try {
            cloudinaryUrl = await this.uploadToCloudinary();
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
            } catch (err) {
                this.showPopup('Could not save image to Firestore.');
            }
        } else {
            this.showPopup('No image URL returned from Cloudinary.');
        }
    }

    retakePhoto() {
        this.capturedImage.style.display = 'none';
        this.video.style.display = 'block';
        this.retakeButton.style.display = 'none';
        this.classifyButton.style.display = 'none';
        this.classifyButton.disabled = false;
        this.captureButton.style.display = 'block';
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