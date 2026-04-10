import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import scanRoutes from './routes/scan.routes.js';
import patientRoutes from './routes/patient.routes.js';
import reportRoutes from './routes/report.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import notificationRoutes from './routes/notification.routes.js';

// AI proxy
import { checkMLHealth } from './services/ai.service.js';

const app = express();

// ─── Global middlewares ───
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ───
app.get('/health', async (_req, res) => {
  const mlHealth = await checkMLHealth();
  res.json({
    status: 'ok',
    service: 'diagnoscope-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    dependencies: {
      mlApi: mlHealth,
    },
  });
});

// ─── API Routes (v1) ───
app.use('/api/v1/auth',          authRoutes);
app.use('/api/v1/doctors',       doctorRoutes);
app.use('/api/v1/scans',         scanRoutes);
app.use('/api/v1/patients',      patientRoutes);
app.use('/api/v1/reports',       reportRoutes);
app.use('/api/v1/analytics',     analyticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// ─── 404 catch ───
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error handler ───
app.use(errorHandler);

// ─── Start server ───
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🧬  DiagnoScope Backend v1.0.0             ║
║                                              ║
║   Port:  ${String(config.port).padEnd(35)}║
║   Env:   ${String(config.nodeEnv).padEnd(35)}║
║   ML:    ${String(config.mlApi.url).padEnd(35)}║
║                                              ║
╚══════════════════════════════════════════════╝
    `);
  });
}

export default app;
