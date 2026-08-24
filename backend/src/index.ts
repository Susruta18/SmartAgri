import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import mongoose from 'mongoose'; // trigger tsx watch reload

import { initIO } from './socket';

import authRoutes from './routes/authRoutes';
import sensorRoutes from './routes/sensorRoutes';
import ingestRoutes from './routes/ingestRoutes';
import cropRoutes from './routes/cropRoutes';
import deviceRoutes from './routes/deviceRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Key'],
}));
app.use(express.json({ limit: '50mb' }));  // Large enough for base64 crop images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/ingest', ingestRoutes);  // ESP32 sends data here
app.use('/api/crop', cropRoutes);       // Crop image upload + AI analysis
app.use('/api/device', deviceRoutes);   // Device settings and IP config

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running', timestamp: new Date().toISOString() });
});

// ── HTTP + Socket.IO Server ───────────────────────────────────────────────────
const httpServer = http.createServer(app);
initIO(httpServer);

// ── MongoDB Connection ─────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrismart')
  .then(() => console.log('[MongoDB] Connected to Atlas'))
  .catch((err) => console.error('[MongoDB] Connection error:', err));

httpServer.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Socket.IO] Real-time updates enabled`);
});
