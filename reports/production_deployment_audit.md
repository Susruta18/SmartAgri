# Production Deployment Audit
**Date:** 2026-08-27  
**Auditor:** Antigravity AI  
**Project:** SmartAgri

---

## Architecture
| Component | Technology | Status |
|-----------|-----------|--------|
| Android App | React/Vite + Capacitor | ✅ Working |
| Backend | Node.js / Express | ✅ Working |
| AI Service | Python FastAPI | ✅ Working |
| Database | MongoDB Atlas | ✅ Connected |
| Model | MobileNetV2 Phase 3 | ✅ Loaded |
| ESP32 Telemetry | `/api/ingest/sensor` | ✅ Ingesting |

---

## Localhost/ngrok Dependencies Found

| File | Issue | Fix Applied |
|------|-------|-------------|
| `frontend/.env.production` | Hardcoded ngrok URL as VITE_API_BASE_URL | ✅ Replaced with placeholder |
| `backend/.env` | AI_SERVICE_URL set to ngrok URL | ✅ Documented; must be set to Render URL |
| `backend/src/controllers/cropController.ts` | localhost:8000 fallback in production | ✅ Fixed — production fails clearly if not set |
| `frontend/src/hooks/useSocketSensor.ts` | localhost:5000 fallback in production | ✅ Fixed — production warns and fails clearly |
| `frontend/src/api/axios.ts` | `ngrok-skip-browser-warning` header | ✅ Removed (not needed for production) |
| `frontend/capacitor.config.ts` | `cleartext: true` | ✅ Set to `false` |
| `backend/src/index.ts` | `origin: '*'` hardcoded CORS | ✅ Now reads `CORS_ORIGINS` env var |
| `ai-service/main.py` | `/predict` used MODEL_PATH env var (root cause of "AI model not configured") | ✅ Fixed — now uses Phase 3 predictor |

---

## Root Cause of "AI model not configured"

**The Bug:** The Android app called `POST /crop/crop-images` on the Node backend.
The backend forwarded to the AI service's `/predict` endpoint.
That endpoint checked if a global `model` variable was loaded via `MODEL_PATH` env var.
Since `MODEL_PATH` was not set in most environments, `model` was `None`.
The AI service returned HTTP 503 `"AI model is not configured"`.
The Node backend caught this and set `modelConfigured: false`.
The frontend displayed "AI Model Not Configured".

**The Fix:** The `/predict` endpoint now uses the `PlantDiseasePredictor` class (same as `/predict/plant-disease`). The predictor resolves the model via `os.path.dirname(__file__)`, which is always correct regardless of working directory or OS. The model loads at startup, not lazily.

---

## Deployment Files Status

| File | Status |
|------|--------|
| `render.yaml` | ✅ Created |
| `ai-service/Dockerfile` | ✅ Created |
| `ai-service/.dockerignore` | ✅ Created |
| `backend/.env.example` | ✅ Created |
| `frontend/.env.example` | ✅ Created |
| `.gitignore` | ✅ Updated |

---

## ESP32 Firmware Status

No ESP32 firmware source files (`.ino`/`.cpp`) are stored in this repository. The firmware is deployed directly on the hardware. The ESP32 must be reconfigured to point to the permanent Render backend URL. See `production_deployment_guide.md` for the exact value.

**ESP32 Endpoint:** `POST https://<smartagri-backend>.onrender.com/api/ingest/sensor`  
**Firmware variable to update:** The URL constant in the ESP32 Arduino sketch (currently pointing to the ngrok URL).

---

## AI Model Path Verification

```
Model file:        ai-service/models/plant_disease_mobilenetv2_phase3.keras  (27.2 MB)
Class names:       ai-service/models/plant_disease_class_names.json
Resolution method: os.path.dirname(os.path.abspath(__file__))
Windows path used: NO
```

---

## Secrets Protection

| Secret | Status |
|--------|--------|
| MONGODB_URI | ✅ In .env (gitignored) |
| JWT_SECRET | ✅ In .env (gitignored) |
| Cloudinary keys | ✅ In .env (gitignored) |
| Firebase serviceAccountKey.json | ✅ Listed in .gitignore |
| DEVICE_SECRET | ✅ In .env (gitignored) |
| .env.example | ✅ Contains only placeholders |
