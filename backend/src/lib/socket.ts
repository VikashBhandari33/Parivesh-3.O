import { Server as SocketServer } from 'socket.io';
import http from 'http';
import { logger } from '../utils/logger';

export let io: SocketServer;

export function initSocket(httpServer: http.Server) {
  io = new SocketServer(httpServer, {
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

  return io;
}
