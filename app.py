# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import torch
from torchvision import transforms as T
from PIL import Image
import timm
import io
import base64
import os

# -----------------------------
#   LEVEL 1 SPEED IMPROVEMENTS
# -----------------------------
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

# Enable CORS
CORS(app,
     resources={r"/*": {"origins": "*"}},
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Cache-Control", "X-Requested-With", "Accept"],
     methods=["GET", "POST", "OPTIONS"])

@app.before_request
def log_request_info():
    size = request.content_length or 0
    app.logger.info(f"Incoming request: {request.method} {request.path} Content-Length={size}")

# Class names
class_names = [
    "metal waste",
    "organic waste",
    "paper waste",
    "plastic waste",
    "battery waste",
    "white-glass",
    "trash",
    "green-glass",
    "E-waste",
    "clothing waste",
    "cardboard waste",
    "brown-glass"
]

# -------- Load Models (ONCE) --------
def load_model(model_name, weight_path):
    print(f"🔄 Loading model: {model_name} from {weight_path}")
    model = timm.create_model(model_name, pretrained=False, num_classes=len(class_names))
    state = torch.load(weight_path, map_location="cpu")
    model.load_state_dict(state)
    model.eval()
    print(f"Loaded model: {model_name}")
    return model

models = {
    "mobilenet": load_model("mobilenetv3_large_100", "mobilenet.pth"),
    "rexnet": load_model("rexnet_150", "rexnet.pth")
}

@app.get("/")
def home():
    return "🔥 Waste Classifier API running!"

# Convert Base64 → bytes
def base64_to_bytes(data_url):
    header, encoded = data_url.split(",", 1)
    return base64.b64decode(encoded)

# -------- PREDICT ENDPOINT --------
@app.post("/predict")
def predict():
    try:
        data = request.get_json()

        if "image" not in data:
            return jsonify({"error": "No image provided"}), 400

        # Fast Base64 decode
        img_bytes = io.BytesIO(base64_to_bytes(data["image"]))
        img = Image.open(img_bytes).convert("RGB")

        # ⚡ FAST PREPROCESSING (no normalize)
        img = img.resize((224, 224), Image.BILINEAR)
        img_tensor = T.ToTensor()(img).unsqueeze(0)

        results = {}

        # Run both models (Level 1 optimization uses inference_mode)
        for name, model in models.items():
            with torch.inference_mode():
                logits = model(img_tensor)
                probs = torch.softmax(logits, dim=1)
                conf, idx = torch.max(probs, dim=1)

            results[name] = {
                "prediction": class_names[idx.item()],
                "confidence": float(conf.item())
            }

        return jsonify(results)

    except Exception as e:
        print("Prediction Error:", e)
        return jsonify({"error": str(e)}), 500

# Run locally (Railway uses Gunicorn)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
