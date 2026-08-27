import axios from 'axios';

// Use the same env var as the main axios instance.
// In production (Android APK), VITE_API_BASE_URL is set in .env.production.
// In development, falls back to '/api' (proxied by Vite to localhost:5000).
const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create an axios instance that automatically adds the token
const api = axios.create({
  baseURL: `${API_URL}/crop-health`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface SensorPreview {
  sensorReadingId: string;
  timestamp: string;
  timeDifferenceMinutes: number;
  soilMoisture: number;
  soilTemperature: number;
  airTemperature: number;
  humidity: number;
  lightIntensity: number;
  rainDetected: boolean;
  deviceId: string;
}

export interface ObservationPayload {
  crop: string;
  healthStatus: 'Healthy' | 'Stressed' | 'Severely_Stressed';
  observationTimestamp: string;
  deviceId?: string;
  observerNotes?: string;
}

export interface StatsData {
  totalObservations: number;
  healthyCount: number;
  stressedCount: number;
  severelyStressedCount: number;
  uniqueCrops: string[];
  uniqueDevices: string[];
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
}

export const getSensorPreview = async (timestamp: string, deviceId: string = 'ESP32-001'): Promise<SensorPreview> => {
  const response = await api.get('/sensor-preview', {
    params: { timestamp, deviceId },
  });
  return response.data;
};

export const createObservation = async (data: ObservationPayload): Promise<any> => {
  const response = await api.post('/observations', data);
  return response.data;
};

export const getStats = async (): Promise<StatsData> => {
  const response = await api.get('/stats');
  return response.data;
};

export const exportDataset = async (): Promise<any> => {
  const response = await api.get('/export');
  return response.data;
};
