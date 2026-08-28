"""
Tests for the AgriSmart Plant Disease API.

Test client uses FastAPI's lifespan context manager to ensure the model
loads correctly before tests run (same as production startup behavior).
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from plant_disease_predictor import PlantDiseasePredictor
import io
import os
import json
from PIL import Image

PHASE3_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "plant_disease_mobilenetv2_phase3.keras")
CLASS_NAMES_PATH = os.path.join(os.path.dirname(__file__), "models", "plant_disease_class_names.json")

MODEL_AVAILABLE = os.path.exists(PHASE3_MODEL_PATH) and os.path.exists(CLASS_NAMES_PATH)


def create_test_image():
    """Helper to create a simple valid in-memory JPEG image."""
    img = Image.new('RGB', (224, 224), color=(34, 139, 34))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    return img_byte_arr.getvalue()


# ── Unit tests (no model needed) ─────────────────────────────────────────────

def test_class_name_parsing():
    predictor = PlantDiseasePredictor(model_path="dummy", class_names_path="dummy")

    # Test valid Crop___Disease
    res = predictor.parse_class_name("Tomato___Early_blight")
    assert res["crop"] == "Tomato"
    assert res["disease"] == "Early blight"
    assert res["is_healthy"] is False

    # Test healthy
    res2 = predictor.parse_class_name("Potato___healthy")
    assert res2["crop"] == "Potato"
    assert res2["disease"] == "healthy"
    assert res2["is_healthy"] is True


def test_model_loading_missing_file():
    predictor = PlantDiseasePredictor(model_path="nonexistent.keras", class_names_path="dummy.json")
    with pytest.raises(FileNotFoundError):
        predictor.load()


# ── Integration tests (require model files) ───────────────────────────────────

@pytest.mark.skipif(not MODEL_AVAILABLE, reason="Model files not found — skipping model-dependent tests.")
def test_health_returns_model_loaded():
    """Health endpoint must report model_loaded=true when model files exist."""
    with TestClient(app) as client:
        r = client.get("/healthz")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["model_loaded"] is True
        assert data["model"] == "plant_disease_mobilenetv2_phase3"


@pytest.mark.skipif(not MODEL_AVAILABLE, reason="Model files not found — skipping model-dependent tests.")
def test_predict_plant_disease_valid_image():
    """Valid image upload should return a structured prediction."""
    test_image_bytes = create_test_image()

    with TestClient(app) as client:
        response = client.post(
            "/predict/plant-disease",
            files={"file": ("test.jpg", test_image_bytes, "image/jpeg")}
        )

    assert response.status_code == 200
    data = response.json()

    # Response schema validation
    assert "predicted_class" in data
    assert "confidence" in data
    assert "crop" in data
    assert "disease" in data
    assert "is_healthy" in data
    assert "top_3" in data

    assert isinstance(data["confidence"], float)
    assert len(data["top_3"]) <= 3


def test_predict_plant_disease_missing_image():
    """Missing file should return 422 Unprocessable Entity."""
    with TestClient(app) as client:
        response = client.post("/predict/plant-disease")
    assert response.status_code == 422


@pytest.mark.skipif(not MODEL_AVAILABLE, reason="Model files not found — skipping model-dependent tests.")
def test_predict_plant_disease_invalid_file_type():
    """Non-image file should return 400 with clear error message."""
    with TestClient(app) as client:
        response = client.post(
            "/predict/plant-disease",
            files={"file": ("test.txt", b"this is text, not an image", "text/plain")}
        )
    assert response.status_code == 400
    assert "File must be an image" in response.json()["detail"]


@pytest.mark.skipif(not MODEL_AVAILABLE, reason="Model files not found — skipping model-dependent tests.")
def test_predict_plant_disease_corrupt_image():
    """Corrupt image bytes should return 400 with clear error message."""
    with TestClient(app) as client:
        response = client.post(
            "/predict/plant-disease",
            files={"file": ("corrupt.jpg", b"corrupted random bytes", "image/jpeg")}
        )
    assert response.status_code == 400
    assert "Failed to process image" in response.json()["detail"]
