const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/env');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const visualAidsRoutes = require('./routes/visualAids.routes');
const boardRoutes = require('./routes/board.routes');
const aiRoutes = require('./routes/ai.routes');
const studyPlannerRoutes = require('./routes/studyPlanner.routes');
const friendRoutes = require('./routes/friend.routes');
const groupRoutes = require('./routes/group.routes');
const communityRoutes = require('./routes/community.routes');
const chatRoutes = require('./routes/chat.routes');

const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json({ limit: '50mb' })); // Increase limit for large file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/visual-aids', visualAidsRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/study-planner', studyPlannerRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/chat', chatRoutes);


// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Collabry API',
    version: '1.0.0',
  });
});

// Error handling - must be last
app.use(notFound);
app.use(errorHandler);

module.exports = app;
