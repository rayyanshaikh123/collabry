const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const couponController = require('../controllers/coupon.controller');

// Rate limit coupon validation to prevent brute-force code guessing
const couponValidateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many coupon validation attempts. Please try again later.',
  },
});

// ============= PUBLIC ROUTES =============

// Validate a coupon (requires auth to check user-specific limits)
router.post('/validate', couponValidateLimiter, protect, couponController.validateCoupon);

// Get public coupon info by code
router.get('/:code', couponController.getCouponInfo);

// ============= ADMIN ROUTES =============

// Create a new coupon
router.post('/admin', protect, authorizeRoles('admin'), couponController.createCoupon);

// Bulk create coupons
router.post('/admin/bulk', protect, authorizeRoles('admin'), couponController.bulkCreateCoupons);

// Get campaign statistics
router.get('/admin/campaign/:campaign/stats', protect, authorizeRoles('admin'), couponController.getCampaignStats);

// Get all coupons
router.get('/admin', protect, authorizeRoles('admin'), couponController.getAllCoupons);

// Get coupon by ID
router.get('/admin/:id', protect, authorizeRoles('admin'), couponController.getCouponById);

// Get coupon statistics
router.get('/admin/:id/stats', protect, authorizeRoles('admin'), couponController.getCouponStats);

// Update a coupon
router.put('/admin/:id', protect, authorizeRoles('admin'), couponController.updateCoupon);

// Deactivate a coupon
router.post('/admin/:id/deactivate', protect, authorizeRoles('admin'), couponController.deactivateCoupon);

// Delete a coupon
router.delete('/admin/:id', protect, authorizeRoles('admin'), couponController.deleteCoupon);

module.exports = router;
