// js/scan.js
import { auth, db } from './firebaseInit.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Ngrok URL of your Flask API
const API_URL = "https://hypernutritive-marley-untheoretically.ngrok-free.dev/predict"; // replace with your current Ngrok URL

class CameraHandler {
    constructor() {
        this.video = document.getElementById('cameraFeed');
        this.canvas = document.getElementById('photoCanvas');
        this.capturedImage = document.getElementById('capturedImage');

        this.captureButton = document.getElementById('capturePhoto');
        this.retakeButton = document.getElementById('retakePhoto');
        this.classifyButton = document.getElementById('classifyButton');

        this.uploadFileInput = document.getElementById('uploadFileInput');
        this.uploadFileButton = document.getElementById('uploadFileButton');
        this.uploadedFile = null;

        this.canvas.width = 640;
        this.canvas.height = 480;
    }

    async initialize() {
        await this.startCamera();

        this.captureButton.addEventListener('click', () => this.captureImage());
        this.retakeButton.addEventListener('click', () => this.retakePhoto());
        this.classifyButton.addEventListener('click', async () => {
            const label = await this.classifyImageAPI();
            await this.saveImageToFirestore(label);
        });

        this.uploadFileButton.addEventListener('click', () => {
            this.uploadFileInput.value = null;
            this.uploadFileInput.click();
        });
        this.uploadFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    async startCamera() {
        try {
            if (this.stream) this.stream.getTracks().forEach(track => track.stop());

            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });

            this.video.srcObject = this.stream;
            this.video.style.display = 'block';
            await new Promise(resolve => this.video.onloadedmetadata = resolve);

            this.captureButton.style.display = 'block';
            this.uploadFileButton.style.display = 'block';
        } catch (err) {
            console.error("❌ Camera error:", err);
            const errorDiv = document.getElementById('cameraError');
            if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.querySelector('p').textContent = "Cannot access camera. Please allow camera permissions or use Upload from PC.";
            }
            this.uploadFileButton.style.display = 'block';
        }
    }

    captureImage() {
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.capturedImage.src = this.canvas.toDataURL('image/jpeg');
        this.capturedImage.style.display = 'block';

        this.video.style.display = 'none';
        this.captureButton.style.display = 'none';
        this.uploadFileButton.style.display = 'none';
        this.retakeButton.style.display = 'block';
        this.classifyButton.style.display = 'block';
    }

    retakePhoto() {
        this.capturedImage.style.display = 'none';
        this.video.style.display = 'block';
        this.retakeButton.style.display = 'none';
        this.classifyButton.style.display = 'none';
        this.classifyButton.disabled = false;

        this.captureButton.style.display = 'block';
        this.uploadFileButton.style.display = 'block';

        const classificationDisplay = document.getElementById('classificationDisplay');
        if (classificationDisplay) classificationDisplay.style.display = 'none';
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        this.uploadedFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            this.capturedImage.src = event.target.result;
            this.capturedImage.style.display = 'block';
            this.video.style.display = 'none';

            this.captureButton.style.display = 'none';
            this.uploadFileButton.style.display = 'none';
            this.retakeButton.style.display = 'block';
            this.classifyButton.style.display = 'block';

            const classificationDisplay = document.getElementById('classificationDisplay');
            if (classificationDisplay) classificationDisplay.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    async classifyImageAPI() {
        const formData = new FormData();

        if (this.uploadedFile) formData.append('file', this.uploadedFile);
        else {
            // Convert canvas to blob
            const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/jpeg'));
            formData.append('file', blob, 'capture.jpg');
        }

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            const data = await res.json();

            // Display results
            const classificationDisplay = document.getElementById('classificationDisplay');
            const classificationInfo = document.getElementById('classificationInfo');
            if (classificationDisplay && classificationInfo) {
                classificationDisplay.style.display = 'block';
                classificationInfo.innerHTML = `
        Detected: ${data.predicted_class} <br>
        Confidence: ${(data.confidence * 100).toFixed(1)}% <br>
        Bin: ${data.bin} <br>
        Suggestion: ${data.suggestion}
    `;
            }

            // Update confidence bar
            const fill = document.querySelector(".confidence-fill");
            const text = document.querySelector(".confidence-text");
            if (fill && text) {
                const confidencePercent = (data.confidence * 100).toFixed(1);
                fill.style.width = confidencePercent + "%";
                text.textContent = `${confidencePercent}% confidence`;
            }

            return data.predicted_class;

        } catch (err) {
            console.error("❌ API classification error:", err);
            this.showPopup("Failed to classify image via API.");
            return null;
        }
    }


    async saveImageToFirestore(classification = null) {
        this.classifyButton.disabled = true;

        let cloudinaryUrl = null;
        try {
            if (this.uploadedFile) cloudinaryUrl = await this.uploadFileToCloudinary(this.uploadedFile);
            else cloudinaryUrl = await this.uploadToCloudinary();
        } catch {
            this.showPopup("Image upload failed.");
            return;
        }

        const user = auth.currentUser;
        const userEmail = user ? user.email : null;

        if (cloudinaryUrl) {
            try {
                await addDoc(collection(db, 'scans'), {
                    imageUrl: cloudinaryUrl,
                    classification: classification || "Unknown",
                    timestamp: new Date().toISOString(),
                    email: userEmail
                });
                this.showPopup(`Image + classification (${classification}) saved!`);
                this.uploadedFile = null;
            } catch {
                this.showPopup("Failed to save to Firestore.");
            }
        } else {
            this.showPopup("No image URL returned from Cloudinary.");
        }
    }

    async uploadFileToCloudinary(file) {
        const cloudName = 'dtmpkhm3z';
        const uploadPreset = 'recycleApp';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url || null;
    }

    async uploadToCloudinary() {
        const base64Image = this.canvas.toDataURL('image/jpeg');
        const cloudName = 'dtmpkhm3z';
        const uploadPreset = 'recycleApp';
        const formData = new FormData();
        formData.append('file', base64Image);
        formData.append('upload_preset', uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url || null;
    }

    showPopup(message) {
        const popup = document.createElement('div');
        popup.className = 'popup-notification';
        popup.textContent = message;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const cameraHandler = new CameraHandler();
    await cameraHandler.initialize();
});
