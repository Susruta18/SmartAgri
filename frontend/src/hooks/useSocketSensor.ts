/**
 * useSocketSensor.ts
 * Socket.IO client hook for real-time ESP32 sensor updates.
 * Listens to the `sensor:update` event emitted by the backend
 * whenever the ESP32 posts new data.
 */
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface SensorData {
  deviceId: string;
  soilMoisture: number;       // %
  soilMoistureRaw: number;    // Raw ADC
  soilTemperature: number;    // °C
  airTemperature: number;     // °C
  humidity: number;           // %
  lightIntensity: number;     // lux
  rainDetected: boolean;
  rainIntensity: number;      // %
  timestamp: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseSocketSensorResult {
  sensorData: SensorData | null;
  status: ConnectionStatus;
  lastUpdated: Date | null;
}

// Derive the Socket.IO backend URL from VITE_API_BASE_URL.
// VITE_API_BASE_URL = "https://smartagri-backend.onrender.com/api"
// → strip "/api" → "https://smartagri-backend.onrender.com"
// In development: VITE_API_BASE_URL is unset → Vite proxy not available for WS
//   → fall back to localhost:5000 (only works in dev, not in Android APK).
const _rawApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const BACKEND_URL = _rawApiBase
  ? _rawApiBase.replace(/\/api\/?$/, '')
  : import.meta.env.PROD
    ? (() => {
        console.error('[AgriSmart] VITE_API_BASE_URL not set — Socket.IO cannot connect in production.');
        return '';
      })()
    : 'http://localhost:5000';

export const useSocketSensor = (): UseSocketSensorResult => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      console.log('[Socket.IO] Connected to backend');
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
      console.log('[Socket.IO] Disconnected');
    });

    socket.on('connect_error', () => {
      setStatus('error');
    });

    // Listen for real-time sensor updates from the ESP32
    socket.on('sensor:update', (data: SensorData) => {
      setSensorData(data);
      setLastUpdated(new Date());
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { sensorData, status, lastUpdated };
};
