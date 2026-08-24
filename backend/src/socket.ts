/**
 * Socket.IO singleton.
 * Initialize once in index.ts with initIO(server),
 * then call getIO() from any controller to emit events.
 */
import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';

let io: IOServer;

export const initIO = (httpServer: HttpServer): IOServer => {
  io = new IOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): IOServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initIO(server) first.');
  }
  return io;
};
