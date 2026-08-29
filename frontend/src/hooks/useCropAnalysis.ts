/**
 * useCropAnalysis.ts
 * TanStack Query mutation hook for uploading a crop image and getting AI analysis.
 *
 * Two separate requests with two completely different formats:
 *
 *  A. Legacy image-save  →  POST /crop/upload  (JSON body)
 *       { imageBase64: "data:image/jpeg;base64,<...>", capturedAt: "<ISO>" }
 *       Handled by uploadAndAnalyzeCrop controller without multer.
 *       Saves image to Cloudinary + MongoDB → powers Recent Scans history.
 *
 *  B. AI prediction  →  POST /predict/plant-disease  (multipart/form-data)
 *       FormData field: "file" = Blob
 *       Content-Type is NOT set manually — axios injects the boundary automatically.
 *       30-second timeout via plantDiseaseApi.ts.
 *       Powers the live Crop Health analysis UI.
 *
 * WHY JSON for the save request (not FormData):
 *   The shared axios instance in axios.ts has a global default header
 *   `Content-Type: application/json`. This prevents axios from auto-detecting
 *   FormData and injecting the multipart boundary for instance-level calls,
 *   meaning the server receives requests with Content-Type: application/json
 *   and no parsed req.file → 400 "Image data is required".
 *   Sending JSON avoids this entirely; the controller reads req.body.imageBase64.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import { predictPlantDisease } from '@/services/plantDiseaseApi';

export interface AnalysisResult {
  imageId: string;
  imageUrl: string;
  capturedAt: string;
  disease: string;
  confidence: number;
  severity: 'Low' | 'Moderate' | 'High' | 'None';
  recommendation: string;
  modelConfigured: boolean;
}

export interface CropHistoryRecord {
  imageId: string;
  imageUrl: string;
  capturedAt: string;
  analysis: AnalysisResult | null;
}

/**
 * useCropUpload — TanStack Query mutation that:
 *  1. Saves the image to the backend (Cloudinary + MongoDB) via JSON
 *  2. Gets the real AI prediction via multipart/form-data
 *  Both run in parallel. The mutation always resolves or rejects — never hangs.
 */
export const useCropUpload = () => {
  return useMutation<AnalysisResult, Error, { imageBase64: string; capturedAt: string }>({
    mutationFn: async ({ imageBase64, capturedAt }) => {
      console.log('[CropHealth] uploadAndAnalyze START');

      // ── STEP 1: Convert base64 → Blob (for AI multipart request only) ─────
      const byteCharacters = atob(imageBase64);
      const byteArrays: BlobPart[] = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      const blob = new Blob(byteArrays, { type: 'image/jpeg' });

      // ── STEP 2a: Legacy image-save (Fire and forget) ───────
      console.log('[CropHealth] image save START (background)');
      api.post('/crop/upload', {
        imageBase64: `data:image/jpeg;base64,${imageBase64}`,
        capturedAt,
      }).catch((err) => {
        console.error('[CropHealth] Background image save FAILED', err?.message);
      });

      // ── STEP 2b: AI prediction ───────
      // Wait only for the AI prediction. Do NOT block on the legacy upload.
      console.log('[CropHealth] Awaiting AI prediction...');
      const aiResult = await predictPlantDisease(blob, 'crop.jpg').catch((err) => {
        console.error('[CropHealth] AI prediction FAILED', err?.message);
        throw err; // Re-throw so mutation rejects and spinner stops
      });

      console.log('[CropHealth] mutation RESOLVED — AI result:', aiResult);

      // ── STEP 3: Map AI result → AnalysisResult shape ──────────────────────
      const isHealthy = aiResult.is_healthy;
      const confidence = aiResult.confidence;
      const disease = isHealthy ? 'Healthy' : aiResult.disease;

      let severity: 'Low' | 'Moderate' | 'High' | 'None' = 'None';
      let recommendation = '';

      if (isHealthy) {
        severity = 'None';
        recommendation =
          'Plant appears healthy. Continue regular monitoring and maintain proper watering, nutrition, and pest management.';
      } else {
        severity = confidence >= 80 ? 'High' : confidence >= 60 ? 'Moderate' : 'Low';
        recommendation =
          'Plant disease detected. Isolate affected plants if possible, remove severely affected leaves, and follow appropriate disease-management practices.';
      }

      return {
        imageId: 'temp-' + Date.now(), // Upload finishes in background
        imageUrl: `data:image/jpeg;base64,${imageBase64}`, // Use local base64 to show immediately
        capturedAt,
        disease,
        confidence,
        severity,
        recommendation,
        modelConfigured: true,
      };
    },
    onError: (err) => {
      console.error('[CropHealth] mutation REJECTED', err?.message);
    },
  });
};

/**
 * useCropHistory — query to fetch past crop analysis records (Recent Scans)
 */
export const useCropHistory = () => {
  return useQuery<{ count: number; records: CropHistoryRecord[] }>({
    queryKey: ['cropHistory'],
    queryFn: async () => {
      const response = await api.get('/crop/history');
      return response.data;
    },
    staleTime: 30000,
  });
};
