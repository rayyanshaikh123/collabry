// Test Group Chat Connection
// Open browser console and run this to test socket connection

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

console.log('Token:', token ? 'EXISTS' : 'MISSING');
console.log('User:', user);

if (token && user) {
  const { io } = require('socket.io-client');
  const SOCKET_URL = 'http://localhost:5000';
  
  const socket = io(`${SOCKET_URL}/chat`, {
    auth: {
      token,
      userId: user._id || user.id,
      userEmail: user.email,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ Connected to chat socket:', socket.id);
    
    // Try to join a group (replace with actual group ID)
    socket.emit('join:conversation', {
      conversationType: 'group',
      conversationId: 'YOUR_GROUP_ID_HERE',
    });
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected:', reason);
  });
}
