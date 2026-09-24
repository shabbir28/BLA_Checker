// Must be the first import: ESM hoists imports, so env vars have to be loaded before
// modules like middleware/auth.js read process.env at evaluation time.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';

import authRoutes from './routes/authRoutes.js';
import dncRoutes from './routes/dncRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { pool } from './config/db.js';
import './config/uploads.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT 1 as healthy');
    return res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'BLA Checker Enterprise API',
      database: dbCheck.rows.length > 0 ? 'CONNECTED' : 'DISCONNECTED',
      version: '1.0.0',
    });
  } catch (error) {
    return res.status(503).json({
      status: 'DEGRADED',
      database: 'DISCONNECTED',
      error: error.message,
    });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/dnc', dncRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  return res.status(status).json({
    message: status === 500
      ? 'An unexpected internal server error occurred.'
      : err.message || 'Request failed.',
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  BLA Checker Enterprise Server is running!`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  API Health: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});

export default app;
