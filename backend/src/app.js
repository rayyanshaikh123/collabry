const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const reportRoutes = require('./routes/report.routes');
const visualAidsRoutes = require('./routes/visualAids.routes');
const boardRoutes = require('./routes/board.routes');
const aiRoutes = require('./routes/ai.routes');
const notebookRoutes = require('./routes/notebook.routes');
const studyPlannerRoutes = require('./routes/studyPlanner.routes');
const friendRoutes = require('./routes/friend.routes');
const groupRoutes = require('./routes/group.routes');
const chatRoutes = require('./routes/chat.routes');
const notificationRoutes = require('./routes/notification.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const webhookRoutes = require('./routes/webhook.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const usageRoutes = require('./routes/usage.routes');
const couponRoutes = require('./routes/coupon.routes');
const gamificationRoutes = require('./routes/gamification.routes');
const focusRoutes = require('./routes/focus.routes');
const recycleBinRoutes = require('./routes/recycleBin.routes');

const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { ensureCsrfToken, verifyCsrfToken } = require('./middlewares/csrf.middleware');

const app = express();

// CORS must be FIRST to handle preflight OPTIONS requests
app.use(cors(config.cors));

// Security: Helmet middleware for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Security: Rate limiting for all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in dev
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security: Stricter rate limiting for authentication routes
// Keyed by IP + email so distributed botnets and per-account attacks are both throttled
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // Much more lenient in dev
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    // Combine IP + lowercase email for a per-account-per-IP key
    const email = (req.body?.email || '').toLowerCase().trim();
    // Normalize IPv6 addresses via the built-in helper
    const ip = req.ip?.replace(/^::ffff:/, '') || 'unknown';
    return `${ip}:${email}`;
  },
  // We handle IPv6 normalization manually above
  validate: { keyGeneratorIpFallback: false },
  message: 'Too many login attempts, please try again after 15 minutes.',
});

// Apply global rate limiter to all API routes
app.use('/api/', globalLimiter);

// Webhook routes BEFORE express.json() middleware
// Razorpay webhooks need raw body for signature verification
app.use('/api/webhooks', webhookRoutes);

// Middleware
app.use(cookieParser()); // Parse cookies (required for httpOnly refresh token)
app.use(express.json({ limit: '50mb' })); // Increase limit for large file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// CSRF Protection (double-submit cookie)
// Ensures a CSRF cookie is set on every response, then verifies it on mutating requests
app.use(ensureCsrfToken);
app.use(verifyCsrfToken({
  excludePaths: [
    '/api/webhooks', // Razorpay webhooks don't have CSRF cookies
    '/api/auth/refresh', // Refresh uses httpOnly cookie — CSRF not needed
  ],
}));

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes); // Apply stricter rate limiting to auth routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/visual-aids', visualAidsRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notebook', notebookRoutes);
app.use('/api/study-planner', studyPlannerRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);


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
