# ── AgriSmart AI Service Dockerfile ──────────────────────────────────────────
# Uses the official TensorFlow 2.18.0 CPU image as base (Keras 3).
# CPU-only is used because Render's free/starter tiers do not provide GPUs.
# MobileNetV2 inference is fast enough on CPU (~200-500ms per image).
FROM tensorflow/tensorflow:2.18.0

# Set working directory
WORKDIR /app

# Install system dependencies required by Pillow (libjpeg, libpng)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies.
# tensorflow is already present in the base image — skip it to avoid conflicts.
# Other dependencies are pinned for reproducibility.
RUN pip install --no-cache-dir \
    "fastapi>=0.110.0" \
    "uvicorn[standard]>=0.29.0" \
    "pydantic>=2.0.0" \
    "requests>=2.31.0" \
    "Pillow>=10.0.0" \
    "numpy>=1.24.0" \
    "python-multipart>=0.0.9" \
    "httpx>=0.27.0"

# Copy model files FIRST to leverage Docker layer caching.
# Large files (27MB .keras) are cached separately from application code.
# Model files change infrequently; code changes do not invalidate the model layer.
COPY models/plant_disease_mobilenetv2_phase3.keras ./models/
COPY models/plant_disease_class_names.json ./models/
COPY models/plant_disease_model_metadata.json ./models/

# Copy application source
COPY main.py .
COPY plant_disease_predictor.py .

# Expose port — Render injects $PORT at runtime, defaulting to 8000
EXPOSE 8000

# Start command — uses $PORT injected by Render, defaults to 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
