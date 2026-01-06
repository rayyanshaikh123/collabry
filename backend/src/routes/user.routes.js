const express = require('express');
const userController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, userController.getProfile);

module.exports = router;
