"""
AgriSmart AI Disease Detection Service
======================================
Production-ready FastAPI service for plant disease prediction.

Endpoints:
  GET  /health                - Service + model health check
  GET  /                      - Root info
  POST /predict               - URL-based prediction (backward compat, uses Phase3 predictor)
  POST /predict/plant-disease - File upload prediction (Phase3 MobileNetV2)
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Structured Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agrismart.ai")

# ── Model Paths (resolved relative to this file, never Windows absolute paths) ──
_SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
PHASE3_MODEL_PATH = os.path.join(_SERVICE_DIR, "models", "plant_disease_savedmodel")
CLASS_NAMES_PATH = os.path.join(_SERVICE_DIR, "models", "plant_disease_class_names.json")
PHASE3_MODEL_NAME = "plant_disease_mobilenetv2_phase3"

import threading

# ── Global predictor instance ────────────────────────────────────────────────────
from plant_disease_predictor import PlantDiseasePredictor

plant_disease_predictor: PlantDiseasePredictor | None = None
model_load_error: str | None = None
_model_lock = threading.Lock()

def _get_or_load_model() -> PlantDiseasePredictor | None:
    """
    Lazy loads the Phase 3 MobileNetV2 model on first prediction request.
    Uses a lock to prevent concurrent requests from loading the model multiple times.
    """
    global plant_disease_predictor, model_load_error

    if plant_disease_predictor is not None and plant_disease_predictor._is_loaded:
        return plant_disease_predictor

    with _model_lock:
        # Double-check inside the lock in case another thread just loaded it
        if plant_disease_predictor is not None and plant_disease_predictor._is_loaded:
            return plant_disease_predictor

        logger.info("[Model] Lazy loading model. This may take up to 60-90 seconds...")
        if not os.path.exists(PHASE3_MODEL_PATH):
            model_load_error = f"Model file not found at: {PHASE3_MODEL_PATH}"
            logger.error(f"[Model] CRITICAL — {model_load_error}")
            return None

        if not os.path.exists(CLASS_NAMES_PATH):
            model_load_error = f"Class names file not found at: {CLASS_NAMES_PATH}"
            logger.error(f"[Model] CRITICAL — {model_load_error}")
            return None

        try:
            predictor = PlantDiseasePredictor(
                model_path=PHASE3_MODEL_PATH,
                class_names_path=CLASS_NAMES_PATH,
            )
            predictor.load()  
            plant_disease_predictor = predictor
            logger.info(f"[Model] Model '{PHASE3_MODEL_NAME}' loaded successfully.")
            return plant_disease_predictor
        except Exception as e:
            model_load_error = str(e)
            plant_disease_predictor = None
            logger.error(f"[Model] CRITICAL — Failed to load model: {e}", exc_info=True)
            return None

# ── Lifespan context (FastAPI startup/shutdown) ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Startup] AgriSmart AI Service starting...")
    logger.info("[Startup] Service is READY. Model will load lazily on first request.")
    yield
    logger.info("[Shutdown] AgriSmart AI Service shutting down.")

# ── App ──────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AgriSmart AI Disease Detection Service",
    version="3.0.0",
    description="Phase 3 MobileNetV2 plant disease detection API",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────────
# Allow all origins here because:
#   - This AI service only receives requests from the Node.js backend (server-to-server).
#   - CORS is only enforced by browsers; the backend calls this directly.
#   - The actual user-facing CORS restriction is on the Node backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response Schemas ─────────────────────────────────────────────────────
class PredictByUrlRequest(BaseModel):
    """Backward-compatible schema for /predict (URL-based)."""
    imageUrl: str


class LegacyPredictResponse(BaseModel):
    """Backward-compatible response for /predict endpoint."""
    disease: str
    confidence: float
    severity: str
    recommendation: str


# ── Health Endpoint ──────────────────────────────────────────────────────────────
@app.get("/healthz")
def health_check():
    """
    Returns service and model health status.
    - 200: service OK, model loaded or waiting to load lazily
    """
    model_loaded = plant_disease_predictor is not None and plant_disease_predictor._is_loaded

    return {
        "status": "ok",
        "model_loaded": model_loaded,
        "model": PHASE3_MODEL_NAME,
        "error": model_load_error,
    }


# ── Root Endpoint ────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    model_loaded = plant_disease_predictor is not None and plant_disease_predictor._is_loaded
    return {
        "message": "AgriSmart AI Disease Detection Service",
        "version": "3.0.0",
        "model": PHASE3_MODEL_NAME,
        "model_loaded": model_loaded,
        "status": "ok",
        "error": model_load_error
    }


# ── /predict — backward-compatible URL-based prediction ──────────────────────────
@app.post("/predict", response_model=LegacyPredictResponse)
async def predict_disease_by_url(request: PredictByUrlRequest):
    """
    Backward-compatible endpoint called by the Node.js cropController.
    Accepts a Cloudinary image URL, downloads the image, and runs Phase 3 inference.

    This replaces the old MODEL_PATH-based implementation with the reliable
    Phase 3 PlantDiseasePredictor. The response shape is preserved for
    backward compatibility with cropController.ts.
    """
    predictor = _get_or_load_model()
    if predictor is None:
        logger.error(
            f"[/predict] Request received but model failed to load. "
            f"Error: {model_load_error}"
        )
        raise HTTPException(
            status_code=503,
            detail={
                "error": "AI model is not configured",
                "message": (
                    f"The Phase 3 plant disease model failed to load at startup. "
                    f"Reason: {model_load_error or 'Unknown'}. "
                    f"Check service logs for details."
                ),
            },
        )

    try:
        import requests as req_lib
        from io import BytesIO

        logger.info(f"[/predict] Downloading image from URL: {request.imageUrl[:80]}...")
        response = req_lib.get(request.imageUrl, timeout=20)
        response.raise_for_status()
        image_bytes = response.content
    except Exception as e:
        logger.error(f"[/predict] Failed to download image: {e}")
        raise HTTPException(
            status_code=400,
            detail={"error": "Failed to download image", "message": str(e)},
        )

    try:
        result = predictor.predict(image_bytes)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail={"error": "Invalid image", "message": str(ve)})
    except Exception as e:
        logger.error(f"[/predict] Inference error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "Prediction failed", "message": str(e)},
        )

    # Map the Phase 3 structured output → legacy response schema
    disease_label = result["disease"] if not result["is_healthy"] else "Healthy"
    confidence = result["confidence"]

    # Severity based on confidence and health status
    if result["is_healthy"]:
        severity = "None"
        recommendation = "Your crop appears healthy. Continue regular monitoring."
    elif confidence >= 85:
        severity = "High"
        recommendation = (
            f"Disease detected: {disease_label}. "
            "Consult an agricultural expert immediately and apply appropriate treatment. "
            "Monitor affected plants daily."
        )
    elif confidence >= 60:
        severity = "Moderate"
        recommendation = (
            f"Possible disease: {disease_label}. "
            "Monitor carefully and consider consulting an agricultural expert if symptoms worsen."
        )
    else:
        severity = "Low"
        recommendation = (
            f"Low-confidence detection: {disease_label}. "
            "Re-examine the plant closely and take another photo in better lighting if possible."
        )

    logger.info(
        f"[/predict] Result: disease={disease_label}, confidence={confidence:.1f}%, severity={severity}"
    )

    return LegacyPredictResponse(
        disease=disease_label,
        confidence=round(confidence, 1),
        severity=severity,
        recommendation=recommendation,
    )


# ── /predict/plant-disease — multipart file upload endpoint ──────────────────────
@app.post("/predict/plant-disease")
async def predict_plant_disease(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file (multipart/form-data) and returns a detailed
    disease prediction using the Phase 3 MobileNetV2 model.
    Used by the dedicated Plant Disease Detection frontend page.

    Validation order:
      1. File must be provided
      2. Content-type must be image/*
      3. File must not be empty
      4. Model must be loaded (503 if not)
      5. Inference
    """
    # Input validation first — these checks are independent of model state
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Model check after input validation
    predictor = _get_or_load_model()
    if predictor is None:
        logger.error(f"[/predict/plant-disease] Model failed to load: {model_load_error}")
        raise HTTPException(
            status_code=503,
            detail=(
                f"AI model is not available. "
                f"Reason: {model_load_error or 'Unknown startup error'}. "
                f"Check service logs."
            ),
        )

    try:
        result = predictor.predict(image_bytes)
        logger.info(
            f"[/predict/plant-disease] Result: class={result['predicted_class']}, "
            f"confidence={result['confidence']:.1f}%"
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except FileNotFoundError as fne:
        raise HTTPException(status_code=503, detail=str(fne))
    except Exception as e:
        logger.error(f"[/predict/plant-disease] Inference error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

