const express = require('express');
const communityController = require('../controllers/community.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes (no auth required)
router.get('/search', communityController.searchCommunities);
router.get('/all', communityController.getCommunities);
router.get('/:identifier', communityController.getCommunity);

// Protected routes (auth required)
router.use(protect);

// Community CRUD
router.post('/', communityController.createCommunity);
router.get('/my/communities', communityController.getUserCommunities);
router.put('/:communityId', communityController.updateCommunity);
router.delete('/:communityId', communityController.deleteCommunity);

// Join/Leave
router.post('/:communityId/join', communityController.joinCommunity);
router.post('/:communityId/leave', communityController.leaveCommunity);

// Moderation
router.put('/:communityId/moderators/:memberId', communityController.addModerator);
router.delete('/:communityId/moderators/:memberId', communityController.removeModerator);
router.delete('/:communityId/members/:memberId', communityController.removeMember);

module.exports = router;
