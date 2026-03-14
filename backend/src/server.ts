import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { Server as SocketServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';

import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { redisClient } from './utils/redis';
import { setupSwagger } from './swagger';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';
import documentRoutes from './routes/documents';
import paymentRoutes from './routes/payments';
import gistRoutes from './routes/gist';
import auditRoutes from './routes/audit';
import adminRoutes from './routes/admin';
import gisRoutes from './routes/gis';
import notificationRoutes from './routes/notifications';
import satelliteRoutes from './routes/satellite';
import './services/gistQueue';
import './services/documentVerificationQueue';

export const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────
export const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join:application', (applicationId: string) => {
    socket.join(`application:${applicationId}`);
  });

  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: 'TOO_MANY_REQUESTS', message: 'Too many auth attempts.' },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
}));

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
const swaggerSpec = setupSwagger();
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/applications', apiLimiter, applicationRoutes);
app.use('/api/documents', apiLimiter, documentRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);
app.use('/api/gist', apiLimiter, gistRoutes);
app.use('/api/audit', apiLimiter, auditRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/gis', apiLimiter, gisRoutes);
app.use('/api/satellite', apiLimiter, satelliteRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);

// ─── Static uploads (local storage fallback) ──────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Route not found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Startup ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');

    await redisClient.ping();
    logger.info('✅ Redis connected');

    httpServer.listen(PORT, () => {
      logger.info(`🚀 CECB Backend running on http://localhost:${PORT}`);
      logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  httpServer.close(async () => {
    await prisma.$disconnect();
    await redisClient.quit();
    process.exit(0);
  });
});

start();
