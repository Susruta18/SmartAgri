/**
 * useCropAnalysis.ts
 * TanStack Query mutation hook for uploading a crop image and getting AI analysis.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/api/axios';

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
 * useCropUpload — mutation to upload base64 image → backend → Cloudinary → AI → result
 */
export const useCropUpload = () => {
  return useMutation<AnalysisResult, Error, { imageBase64: string; capturedAt: string }>({
    mutationFn: async ({ imageBase64, capturedAt }) => {
      // Convert base64 (without data URI prefix) to a Blob
      const byteCharacters = atob(imageBase64);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      const blob = new Blob(byteArrays, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('image', blob, 'crop.jpg');
      formData.append('capturedAt', capturedAt);

      const response = await api.post<AnalysisResult>('/crop/crop-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
  });
};

/**
 * useCropHistory — query to fetch past crop analysis records
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
