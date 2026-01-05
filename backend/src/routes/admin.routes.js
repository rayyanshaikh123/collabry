const express = require('express');
const adminController = require('../controllers/admin.controller');
const protect = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

const router = express.Router();

// Middleware for all admin routes
const adminAuth = [protect, authorizeRoles('admin')];

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard
 * @access  Private/Admin only
 */
router.get('/dashboard', ...adminAuth, adminController.getDashboard);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private/Admin only
 */
router.get('/users', ...adminAuth, adminController.getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user
 * @access  Private/Admin only
 */
router.get('/users/:id', ...adminAuth, adminController.getUser);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Private/Admin only
 */
router.post('/users', ...adminAuth, adminController.createUser);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private/Admin only
 */
router.put('/users/:id', ...adminAuth, adminController.updateUser);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private/Admin only
 */
router.delete('/users/:id', ...adminAuth, adminController.deleteUser);

module.exports = router;
