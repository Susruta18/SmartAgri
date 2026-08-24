from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

app = FastAPI(title="AgriSmart AI Disease Detection Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model Loading ─────────────────────────────────────────────────────────────
# Set MODEL_PATH in the environment to enable real predictions.
# Example: MODEL_PATH=/path/to/plant_disease_model.h5
# When MODEL_PATH is not set, the service returns a clear "not configured" response.
MODEL_PATH = os.getenv("MODEL_PATH", "")
model = None
CLASS_NAMES = []

if MODEL_PATH and os.path.exists(MODEL_PATH):
    try:
        # Attempt to load the model (TensorFlow/Keras assumed)
        import tensorflow as tf  # type: ignore
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"[AI Service] Model loaded from {MODEL_PATH}")

        # Load class names if provided via CLASS_NAMES_PATH env var
        class_names_path = os.getenv("CLASS_NAMES_PATH", "")
        if class_names_path and os.path.exists(class_names_path):
            with open(class_names_path) as f:
                CLASS_NAMES = [line.strip() for line in f.readlines()]
            print(f"[AI Service] Loaded {len(CLASS_NAMES)} class names")
    except Exception as e:
        print(f"[AI Service] WARNING: Failed to load model: {e}")
        model = None
else:
    print("[AI Service] No MODEL_PATH set. Running in stub mode.")


# ── Request/Response schemas ───────────────────────────────────────────────────
class PredictRequest(BaseModel):
    imageUrl: str


class PredictResponse(BaseModel):
    disease: str
    confidence: float
    severity: str
    recommendation: str


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {
        "message": "AgriSmart AI Disease Detection Service",
        "modelLoaded": model is not None,
        "status": "ready" if model is not None else "model_not_configured",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "modelLoaded": model is not None,
    }


@app.post("/predict", response_model=PredictResponse)
async def predict_disease(request: PredictRequest):
    """
    Accepts a Cloudinary image URL and returns disease prediction.
    If the model is not configured, returns HTTP 503 with a clear error message.
    The backend (Node.js) catches this and shows a user-friendly message in the app.
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "AI model is not configured",
                "message": (
                    "No trained model is loaded. Set the MODEL_PATH environment variable "
                    "to point to a trained .h5 or SavedModel file to enable predictions."
                ),
            },
        )

    try:
        import requests
        import numpy as np
        from PIL import Image
        from io import BytesIO

        # Download the image from Cloudinary
        response = requests.get(request.imageUrl, timeout=15)
        response.raise_for_status()

        img = Image.open(BytesIO(response.content)).convert("RGB")
        img = img.resize((224, 224))  # Adjust to your model's input size
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        predictions = model.predict(img_array)
        predicted_index = int(np.argmax(predictions[0]))
        confidence = float(np.max(predictions[0])) * 100

        disease_name = CLASS_NAMES[predicted_index] if CLASS_NAMES else f"Class_{predicted_index}"

        # Determine severity based on confidence bands
        if confidence >= 85:
            severity = "High"
        elif confidence >= 60:
            severity = "Moderate"
        else:
            severity = "Low"

        if "healthy" in disease_name.lower():
            severity = "None"
            recommendation = "Your crop appears healthy. Continue regular monitoring."
        else:
            recommendation = (
                f"Disease detected: {disease_name}. "
                "Consult an agricultural expert and apply appropriate treatment. "
                "Monitor affected plants daily."
            )

        return PredictResponse(
            disease=disease_name,
            confidence=round(confidence, 1),
            severity=severity,
            recommendation=recommendation,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "Prediction failed", "message": str(e)})
