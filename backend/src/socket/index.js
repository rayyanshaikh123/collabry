const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

let io = null;

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - HTTP server instance
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // REMOVED redundant global middleware to prevent double-auth hangs
  // Authentication is handled at the namespace level (e.g., boardNamespace.js)

  // Connection handler (simplified)
  io.on('connection', (socket) => {
    console.log(`🔌 New base socket connection: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`❌ Base socket disconnected: ${reason}`);
    });
  });

  // Initialize board namespace
  require('./boardNamespace')(io);

  // Initialize chat namespace
  const { initializeChatNamespace } = require('./chatNamespace');
  initializeChatNamespace(io);

  // Initialize notification namespace
  require('./notificationNamespace')(io);
  require('./notebookCollabNamespace')(io);

  console.log('🔌 Socket.IO initialized');
  return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

module.exports = { initializeSocket, getIO };
