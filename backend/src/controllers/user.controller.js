const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  Private (Auth required)
 */
const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

module.exports = {
  getProfile,
};
