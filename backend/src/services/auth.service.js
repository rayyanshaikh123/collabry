const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

/**
 * Register a new user
 * @param {Object} data - User registration data
 * @returns {Object} - User object and tokens
 */
const registerUser = async (data) => {
  const { name, email, password } = data;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    password,
  });

  // Generate tokens
  const payload = { 
    id: user._id, 
    email: user.email, 
    role: user.role 
  };
  
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Return sanitized user and tokens
  return {
    user: user.toJSON(),
    accessToken,
    refreshToken,
  };
};

/**
 * Login user
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} - User object and tokens
 */
const loginUser = async (email, password) => {
  // Validate input
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  // Find user and include password field
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const payload = { 
    id: user._id, 
    email: user.email, 
    role: user.role 
  };
  
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Return sanitized user and tokens
  return {
    user: user.toJSON(),
    accessToken,
    refreshToken,
  };
};

/**
 * Refresh access token using refresh token
 * @param {String} refreshToken - JWT refresh token
 * @returns {Object} - New access and refresh tokens
 */
const refreshTokens = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    // Generate new tokens
    const payload = { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    };
    
    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(error.message || 'Invalid refresh token', 401);
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshTokens,
};
