import axios from 'axios';

// ── AI Service URL ────────────────────────────────────────────────────────────
// The AI service is a separate FastAPI container on Render.
// We call it DIRECTLY from the frontend rather than routing through the backend
// proxy (/api/predict → backend → AI service), because the backend proxy
// was producing 404 errors when AI_SERVICE_URL was not correctly configured
// on the Render backend environment.
//
// In production (Android APK): VITE_AI_SERVICE_URL is baked into the bundle at
// build time from frontend/.env.production.
//   VITE_AI_SERVICE_URL=https://smartagri-ai.onrender.com
//
// In development: falls back to localhost:8000 (local AI service).
const aiBaseURL =
  import.meta.env.VITE_AI_SERVICE_URL ||
  (import.meta.env.PROD ? '' : 'http://localhost:8000');

if (import.meta.env.PROD && !import.meta.env.VITE_AI_SERVICE_URL) {
  console.error(
    '[AgriSmart] CRITICAL: VITE_AI_SERVICE_URL is not set in the production build. ' +
    'AI predictions will fail. Set this variable in frontend/.env.production before building the APK.'
  );
}

// Dedicated axios instance for the AI service.
// This is completely separate from the shared api instance (axios.ts) so that:
//   1. The Content-Type: application/json default on the shared instance
//      does not interfere with multipart/form-data boundary generation here.
//   2. No auth token interceptor is applied (AI service is public).
//   3. baseURL points to the AI service, not the backend.
const aiApi = axios.create({
  baseURL: aiBaseURL,
  // NOTE: Do NOT set Content-Type here. For FormData (multipart) requests,
  // axios must set it automatically so it can inject the boundary string.
  // Manually setting 'multipart/form-data' strips the boundary and the
  // server cannot parse the body.
});

export interface PredictionResult {
  predicted_class: string;
  confidence: number;
  crop: string;
  disease: string;
  is_healthy: boolean;
  top_3: Array<{
    predicted_class: string;
    confidence: number;
    crop: string;
    disease: string;
    is_healthy: boolean;
  }>;
}

// ── Timeout configuration ────────────────────────────────────────────────────
// The Render AI service (standard plan Docker container) has a cold-start time
// of 60–90 seconds when it has been idle. TensorFlow and the 28MB SavedModel
// are loaded eagerly at startup, so the ENTIRE cold-start delay happens before
// the first prediction request gets any response.
//
// 30 seconds is insufficient. 120 seconds covers:
//   - Container restart:        ~10s
//   - TensorFlow initialization: ~30–50s
//   - Model file load (28MB):   ~10–20s
//   - Actual inference:         <2s
//
// Only this specific request receives the long timeout.
// All other API calls use the shared instance in axios.ts (no global timeout).
const AI_PREDICTION_TIMEOUT_MS = 120_000; // 120 seconds

/**
 * Sends an image file directly to the AI service for plant disease prediction.
 *
 * Endpoint: POST <VITE_AI_SERVICE_URL>/predict/plant-disease
 * Format:   multipart/form-data, field name: "file"
 * Timeout:  120 seconds (covers Render cold-start + TF model load)
 *
 * @param image The image file (JPG, PNG, WEBP) or Blob to predict.
 * @param filename Filename hint for the server (e.g. 'crop.jpg').
 * @returns The prediction result including crop, disease, confidence, and is_healthy.
 */
export const predictPlantDisease = async (
  image: File | Blob,
  filename: string = 'image.jpg'
): Promise<PredictionResult> => {
  const formData = new FormData();
  formData.append('file', image, filename);

  console.log('[PlantDisease] baseURL:', aiApi.defaults.baseURL);
  console.log('[PlantDisease] endpoint:', '/predict/plant-disease');
  console.log('[PlantDisease] file field name: file');
  console.log('[PlantDisease] blob size:', (image as Blob).size, 'bytes');
  console.log('[PlantDisease] blob type:', (image as Blob).type);

  const startTime = Date.now();
  try {
    console.log('[PlantDisease] Prediction started');
    console.log('[PlantDisease] Request sent to:', aiApi.defaults.baseURL + '/predict/plant-disease');
    // NOTE: Do NOT manually set Content-Type for multipart/form-data.
    // The aiApi instance has no default Content-Type, so axios will
    // correctly detect the FormData and set the boundary automatically.
    const response = await aiApi.post<PredictionResult>('/predict/plant-disease', formData, {
      timeout: AI_PREDICTION_TIMEOUT_MS,
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[PlantDisease] Response received`);
    console.log(`[PlantDisease] Prediction duration: ${duration}s`);
    console.log('[CropHealth] AI prediction SUCCESS', response.data);
    return response.data;
  } catch (error: any) {
    // Surface as much diagnostic detail as possible in the error message
    const requestedUrl = error.config?.url ?? '/predict/plant-disease';
    const baseUrl = error.config?.baseURL ?? aiBaseURL;
    console.error(
      '[PlantDisease] Request failed:',
      `${baseUrl}${requestedUrl}`,
      'status:', error.response?.status,
      'data:', error.response?.data
    );

    if (error.response) {
      const status = error.response.status;
      const detail = error.response.data?.detail || error.response.data?.message || 'Unknown error occurred.';

      if (status === 400) {
        throw new Error(`Invalid request: ${detail}`);
      } else if (status === 413) {
        throw new Error('Image file is too large. Please upload a smaller image.');
      } else if (status === 422) {
        throw new Error('Validation error: Please ensure you uploaded a valid image.');
      } else if (status === 503) {
        throw new Error('AI prediction service is currently unavailable. Please try again later.');
      } else {
        throw new Error(`Server error (${status}): ${detail}`);
      }
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(0);
      console.warn(`[PlantDisease] Prediction timed out after ${duration}s`);
      throw new Error(
        'AI prediction timed out. The AI model is waking up after being idle — ' +
        'this can take up to 2 minutes on first use. Please tap Retry in a moment.'
      );
    } else if (error.request) {
      throw new Error('Network error: Unable to reach the AI service. Please check your connection.');
    } else {
      throw new Error(`Error: ${error.message}`);
    }
  }
};
