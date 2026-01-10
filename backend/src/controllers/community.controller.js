const communityService = require('../services/community.service');
const asyncHandler = require('../utils/asyncHandler');

class CommunityController {
  // Create community
  createCommunity = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const community = await communityService.createCommunity(userId, req.body);

    res.status(201).json({
      message: 'Community created successfully',
      community,
    });
  });

  // Get all communities
  getCommunities = asyncHandler(async (req, res) => {
    const { category, search, isPrivate } = req.query;
    const filters = { category, search, isPrivate };

    const communities = await communityService.getCommunities(filters);

    res.json({ communities, count: communities.length });
  });

  // Get community by ID or slug
  getCommunity = asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    const community = await communityService.getCommunityByIdOrSlug(identifier);

    res.json({ community });
  });

  // Get user's communities
  getUserCommunities = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const communities = await communityService.getUserCommunities(userId);

    res.json({ communities, count: communities.length });
  });

  // Update community
  updateCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    const community = await communityService.updateCommunity(communityId, userId, req.body);

    res.json({
      message: 'Community updated successfully',
      community,
    });
  });

  // Delete community
  deleteCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    const result = await communityService.deleteCommunity(communityId, userId);

    res.json(result);
  });

  // Join community
  joinCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    const community = await communityService.joinCommunity(communityId, userId);

    res.json({
      message: 'Joined community successfully',
      community,
    });
  });

  // Leave community
  leaveCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    const result = await communityService.leaveCommunity(communityId, userId);

    res.json(result);
  });

  // Add moderator
  addModerator = asyncHandler(async (req, res) => {
    const { communityId, memberId } = req.params;
    const userId = req.user._id;

    const community = await communityService.addModerator(communityId, userId, memberId);

    res.json({
      message: 'Moderator added successfully',
      community,
    });
  });

  // Remove moderator
  removeModerator = asyncHandler(async (req, res) => {
    const { communityId, memberId } = req.params;
    const userId = req.user._id;

    const community = await communityService.removeModerator(communityId, userId, memberId);

    res.json({
      message: 'Moderator role removed',
      community,
    });
  });

  // Remove member
  removeMember = asyncHandler(async (req, res) => {
    const { communityId, memberId } = req.params;
    const userId = req.user._id;

    const community = await communityService.removeMember(communityId, userId, memberId);

    res.json({
      message: 'Member removed successfully',
      community,
    });
  });

  // Search communities
  searchCommunities = asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const communities = await communityService.searchCommunities(q.trim());

    res.json({ communities, count: communities.length });
  });
}

module.exports = new CommunityController();
