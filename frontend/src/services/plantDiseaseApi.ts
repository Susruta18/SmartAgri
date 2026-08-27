import api from '@/api/axios';

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

/**
 * Sends an image file to the AI service for plant disease prediction.
 * @param image The image file (JPG, PNG, WEBP) to predict.
 * @returns The prediction result including crop, disease, and confidence.
 */
export const predictPlantDisease = async (image: File | Blob, filename: string = 'image.jpg'): Promise<PredictionResult> => {
  const formData = new FormData();
  formData.append('file', image, filename);

  try {
    const response = await api.post<PredictionResult>('/predict/plant-disease', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const detail = error.response.data?.detail || 'Unknown error occurred.';
      
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
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to the prediction service. Please check your connection.');
    } else {
      throw new Error(`Error: ${error.message}`);
    }
  }
};
