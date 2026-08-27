# SmartAgri Production Deployment Guide

## Architecture
```
Android APK (Capacitor)
        │
        │ HTTPS
        ▼
Render Node.js Backend  ────────► MongoDB Atlas
        │
        │ HTTP (internal to Render)
        ▼
Render FastAPI AI Service
        │
        ▼
Plant Disease MobileNetV2 Phase 3 Model (bundled in Docker image)

ESP32 ──────────────────► Render Node.js Backend (HTTPS)
```

---

## Step 1: MongoDB Atlas (if not already done)

Your existing MongoDB is already at Atlas (from your `backend/.env` MONGODB_URI — it shows `mongodb+srv://`). **No migration needed.**

✅ Just copy your existing `MONGODB_URI` from `backend/.env` for use in Render.

---

## Step 2: Push Code to GitHub

```bash
git add -A
git commit -m "chore: production deployment configuration"
git push origin master
```

> **Important:** Verify the following are NOT committed:
> - `backend/.env` (contains real secrets)
> - `backend/serviceAccountKey.json` (Firebase key)
> - `ai-service/venv/` (virtual environment)

---

## Step 3: Deploy AI Service on Render (Docker)

> **Why this first?** You need the AI service URL to configure the backend.

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Set the following:

| Setting | Value |
|---------|-------|
| **Name** | `smartagri-ai` |
| **Region** | Singapore |
| **Branch** | `master` |
| **Root Directory** | `ai-service` |
| **Runtime** | **Docker** |
| **Dockerfile Path** | `./Dockerfile` |
| **Plan** | **Standard ($25/mo)** ⚠️ Free/Starter will crash (TF needs ≥2GB RAM) |

4. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `PORT` | `8000` |

5. Click **Create Web Service**
6. Wait for build (~5-10 minutes — Docker pulls TF base image + installs model)
7. Once deployed, note the URL: `https://smartagri-ai.onrender.com`
8. **Verify**: Visit `https://smartagri-ai.onrender.com/health` — should return `{"status":"ok","model_loaded":true,"model":"plant_disease_mobilenetv2_phase3"}`

---

## Step 4: Deploy Node Backend on Render

1. Go to **New** → **Web Service**
2. Connect your GitHub repository
3. Set the following:

| Setting | Value |
|---------|-------|
| **Name** | `smartagri-backend` |
| **Region** | Singapore |
| **Branch** | `master` |
| **Root Directory** | `backend` |
| **Runtime** | **Node** |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node dist/index.js` |
| **Plan** | **Starter ($7/mo)** (or Free for testing) |
| **Health Check Path** | `/api/health` |

4. Add **Environment Variables** (click "Add Environment Variable"):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | Copy from `backend/.env` |
| `JWT_SECRET` | Copy from `backend/.env` |
| `CLOUDINARY_CLOUD_NAME` | Copy from `backend/.env` |
| `CLOUDINARY_API_KEY` | Copy from `backend/.env` |
| `CLOUDINARY_API_SECRET` | Copy from `backend/.env` |
| `AI_SERVICE_URL` | `https://smartagri-ai.onrender.com` |
| `CORS_ORIGINS` | `capacitor://localhost,http://localhost` |
| `DEVICE_SECRET` | Leave blank (or set a secret key for ESP32) |

5. **Firebase Secret File** (for push notifications):
   - Go to **Environment** → **Secret Files**
   - File path: `./serviceAccountKey.json`
   - Paste the contents of your local `backend/serviceAccountKey.json`

6. Click **Create Web Service**
7. Wait for build (~2-3 minutes)
8. Note the URL: `https://smartagri-backend.onrender.com`
9. **Verify**: Visit `https://smartagri-backend.onrender.com/api/health`

---

## Step 5: Configure Android App for Production

**This step bakes the permanent Render URL into the Android APK.**

1. Open `frontend/.env.production`
2. Replace the placeholder with your actual Render backend URL:
   ```
   VITE_API_BASE_URL=https://smartagri-backend.onrender.com/api
   ```
3. Build the React/Vite frontend:
   ```powershell
   cd frontend
   npm run build
   ```
4. Sync with Capacitor Android:
   ```powershell
   npx cap sync android
   ```
5. Build the Android APK:
   ```powershell
   npx cap build android
   ```
   Or open in Android Studio:
   ```powershell
   npx cap open android
   ```
   Then: Build → Generate Signed APK/Bundle

6. Install on your Android device and test:
   - Login → should authenticate against Render backend
   - Dashboard → should show ESP32 sensor data from MongoDB
   - Plant Disease page → should run AI inference via Render AI service
   - Crop Health → should save observations to MongoDB

---

## Step 6: Configure ESP32 for Production

The ESP32 firmware must be updated to send telemetry to the Render backend instead of the local laptop/ngrok URL.

**Find the URL constant in your Arduino sketch** — it will look like:
```cpp
const char* serverUrl = "https://unadministrable-narcisa-bucolically.ngrok-free.dev/api/ingest/sensor";
```

**Replace it with:**
```cpp
const char* serverUrl = "https://smartagri-backend.onrender.com/api/ingest/sensor";
```

If `DEVICE_SECRET` was set on Render, also update the device key header:
```cpp
http.addHeader("X-Device-Key", "YOUR_DEVICE_SECRET");
```

Flash the firmware and verify telemetry arrives in MongoDB.

---

## Environment Variable Summary

### Backend (Render → smartagri-backend → Environment)
| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random 32+ character secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `AI_SERVICE_URL` | `https://smartagri-ai.onrender.com` |
| `CORS_ORIGINS` | `capacitor://localhost,http://localhost` |
| `DEVICE_SECRET` | Optional ESP32 auth key |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `./serviceAccountKey.json` |

### AI Service (Render → smartagri-ai → Environment)
| Variable | Description |
|----------|-------------|
| `PORT` | `8000` |

### Android Build (`frontend/.env.production`)
| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | `https://smartagri-backend.onrender.com/api` |

---

## Health Check URLs

| Service | URL |
|---------|-----|
| Backend | `https://smartagri-backend.onrender.com/api/health` |
| AI Service | `https://smartagri-ai.onrender.com/health` |

---

## Viewing Logs

- **Render Dashboard** → select service → **Logs** tab
- Logs are live-streamed and searchable

## Restarting Services

- **Render Dashboard** → service → **Manual Deploy** → **Deploy latest commit**
- Or push a new commit to GitHub — Render auto-deploys on push

## Updating the AI Model

1. Replace `ai-service/models/plant_disease_mobilenetv2_phase3.keras` with the new model
2. Update `ai-service/models/plant_disease_class_names.json` if classes changed
3. Push to GitHub
4. Render will automatically rebuild the Docker image and redeploy
5. Verify `/health` shows `model_loaded: true`

## Rolling Back

- **Render Dashboard** → service → **Events** tab → find a previous deploy → **Rollback**

---

## Security Notes

- ✅ All secrets are in Render Environment Variables, never in code
- ✅ `.env` files are gitignored
- ✅ `serviceAccountKey.json` is gitignored
- ✅ MongoDB not exposed publicly (Atlas IP whitelist recommended)
- ✅ CORS restricted to Android app origins only in production
- ✅ Backend uses HTTPS (Render provides free TLS)
- ✅ AI service uses HTTPS (Render provides free TLS)
- ⚠️ MongoDB Atlas: Go to Network Access and whitelist `0.0.0.0/0` (all IPs) for Render, or use Atlas private networking

---

## Free Tier Limitations

> **Important:** If using Render's **Free** tier for the backend:
> - Free services **sleep after 15 minutes of inactivity**
> - First request after sleep takes ~30 seconds to wake up
> - Use **Starter ($7/mo)** to prevent sleeping
> - The AI service **cannot** run on Free or Starter — it needs Standard ($25/mo) for TensorFlow RAM requirements
