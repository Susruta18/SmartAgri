import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables before importing any local modules that might rely on them
dotenv.config();

import http from 'http';
import mongoose from 'mongoose'; // trigger tsx watch reload

import { initIO } from './socket';

import authRoutes from './routes/authRoutes';
import sensorRoutes from './routes/sensorRoutes';
import ingestRoutes from './routes/ingestRoutes';
import cropRoutes from './routes/cropRoutes';
import deviceRoutes from './routes/deviceRoutes';
import notificationRoutes from './routes/notificationRoutes';
import cropHealthRoutes from './routes/cropHealthRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Production: set CORS_ORIGINS to comma-separated allowed origins.
//   Capacitor Android: capacitor://localhost
//   Local dev browser: http://localhost,http://localhost:5173
// If CORS_ORIGINS is not set, defaults to '*' (development convenience only).
const corsOrigins: string | string[] = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : '*';

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Key'],
  credentials: Array.isArray(corsOrigins), // credentials only valid with explicit origins
}));
app.use(express.json({ limit: '50mb' }));  // Large enough for base64 crop images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/ingest', ingestRoutes);          // ESP32 sends data here
app.use('/api/crop', cropRoutes);              // Crop image upload + AI analysis
// Fallback for frontend clients that haven't refreshed to pick up the /crop/ path
import multer from 'multer';
import { uploadAndAnalyzeCrop } from './controllers/cropController';
import { authMiddleware } from './middleware/authMiddleware';
app.post('/api/crop-images', authMiddleware, multer({ storage: multer.memoryStorage() }).single('image'), uploadAndAnalyzeCrop);

app.use('/api/device', deviceRoutes);          // Device settings and IP config
app.use('/api/notifications', notificationRoutes); // Push notification management
app.use('/api/crop-health', cropHealthRoutes); // Crop Health Data Collection

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running', timestamp: new Date().toISOString() });
});

// ── HTTP + Socket.IO Server ───────────────────────────────────────────────────
const httpServer = http.createServer(app);
initIO(httpServer);

// ── MongoDB Connection ────────────────────────────────────────────────────
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri && process.env.NODE_ENV === 'production') {
  console.error('[MongoDB] CRITICAL: MONGODB_URI is not set in production. The service will crash on first DB operation.');
}

mongoose
  .connect(mongoUri || 'mongodb://localhost:27017/agrismart')
  .then(() => console.log('[MongoDB] Connected successfully'))
  .catch((err) => console.error('[MongoDB] Connection error:', err));

httpServer.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Socket.IO] Real-time updates enabled`);
  console.log(`[Env] Cloudinary configured: ${!!process.env.CLOUDINARY_CLOUD_NAME}`);
});

