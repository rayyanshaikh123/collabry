const Community = require('../models/Community');
const User = require('../models/User');

class CommunityService {
  // Create community
  async createCommunity(userId, data) {
    const { name, description, avatar, banner, category, tags, isPrivate, requiresApproval, rules } = data;

    // Check if community name already exists
    const existing = await Community.findOne({ name });
    if (existing) {
      throw new Error('Community name already exists');
    }

    const community = await Community.create({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description,
      avatar,
      banner,
      category,
      tags,
      isPrivate,
      requiresApproval,
      rules,
      creator: userId,
      moderators: [userId],
      members: [
        {
          user: userId,
          role: 'moderator',
        },
      ],
      stats: {
        memberCount: 1,
        postCount: 0,
      },
    });

    return await community.populate('creator', 'name email avatar');
  }

  // Get all communities (with filters)
  async getCommunities(filters = {}) {
    const { category, search, isPrivate } = filters;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    if (isPrivate !== undefined) {
      query.isPrivate = isPrivate;
    }

    const communities = await Community.find(query)
      .populate('creator', 'name email avatar')
      .select('-members')
      .sort({ 'stats.memberCount': -1, createdAt: -1 })
      .limit(50);

    return communities;
  }

  // Get community by ID or slug
  async getCommunityByIdOrSlug(identifier) {
    const community = await Community.findOne({
      $or: [{ _id: identifier }, { slug: identifier }],
    })
      .populate('creator', 'name email avatar')
      .populate('moderators', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!community) {
      throw new Error('Community not found');
    }

    return community;
  }

  // Get user's communities
  async getUserCommunities(userId) {
    const communities = await Community.find({
      'members.user': userId,
    })
      .populate('creator', 'name email avatar')
      .sort({ updatedAt: -1 });

    return communities;
  }

  // Update community
  async updateCommunity(communityId, userId, updates) {
    const community = await Community.findById(communityId);

    if (!community) {
      throw new Error('Community not found');
    }

    // Check if user is moderator
    const isModerator = community.moderators.some(
      (mod) => mod.toString() === userId.toString()
    );

    if (!isModerator) {
      throw new Error('Only moderators can update community');
    }

    // Update allowed fields
    const allowedUpdates = ['description', 'avatar', 'banner', 'tags', 'isPrivate', 'requiresApproval', 'rules', 'settings'];
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (key === 'settings' || key === 'rules') {
          community[key] = updates[key];
        } else {
          community[key] = updates[key];
        }
      }
    });

    await community.save();

    return await community.populate('creator moderators members.user', 'name email avatar');
  }

  // Delete community
  async deleteCommunity(communityId, userId) {
    const community = await Community.findById(communityId);

    if (!community) {
      throw new Error('Community not found');
    }

    // Only creator can delete
    if (community.creator.toString() !== userId.toString()) {
      throw new Error('Only creator can delete community');
    }

    await community.deleteOne();

    return { message: 'Community deleted successfully' };
  }

  // Join community
  async joinCommunity(communityId, userId) {
    const community = await Community.findById(communityId);

    if (!community) {
      throw new Error('Community not found');
    }

    // Check if already a member
    const alreadyMember = community.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (alreadyMember) {
      throw new Error('Already a member of this community');
    }

    community.members.push({
      user: userId,
      role: 'member',
    });

    community.stats.memberCount = community.members.length;

    await community.save();

    return await community.populate('members.user', 'name email avatar');
  }

  // Leave community
  async leaveCommunity(communityId, userId) {
    const community = await Community.findById(communityId);

    if (!community) {
      throw new Error('Community not found');
    }

    // Cannot leave if creator
    if (community.creator.toString() === userId.toString()) {
      throw new Error('Creator cannot leave community. Delete it instead.');
    }

    // Remove member
    community.members = community.members.filter(
      (member) => member.user.toString() !== userId.toString()
    );

    // Remove from moderators if present
    community.moderators = community.moderators.filter(
      (mod) => mod.toString() !== userId.toString()
    );

    community.stats.memberCount = community.members.length;

    await community.save();

    return { message: 'Left community successfully' };
  }

  // Add moderator
  async addModerator(communityId, userId, memberId) {
    const community = await Community.findById(communityId);

    if (!community) {
      throw new Error('Community not found');
    }

    // Only creator can add moderators
    if (community.creator.toString() !== userId.toString()) {
      throw new Error('Only creator can add moderators');
    }

    // Check if member exists
    const member = community.members.find(
      (m) => m.user.toString() === memberId.toString()
    );

    if (!member) {
      throw new Error('User is not a member of this community');
    }

    // Check if already moderator
    const isModerator = community.moderators.some(
      (mod) => mod.toString() === memberId.toString()
    );

    if (isModerator) {
      throw new Error('User is already a moderator');
    }

    community.moderators.push(memberId);
    member.role = 'moderator';

    await community.save();

    return await community.populate('moderators members.user', 'name email avatar');
  }

  // Remove moderator
  async removeModerator(communityId, userId, memberId) {
    const community = await Community.findById(communityId);

    if (!community) {
      throw new Error('Community not found');
    }

    // Only creator can remove moderators
    if (community.creator.toString() !== userId.toString()) {
      throw new Error('Only creator can remove moderators');
    }

    // Cannot remove creator
    if (community.creator.toString() === memberId.toString()) {
      throw new Error('Cannot remove creator moderator role');
    }

    // Remove from moderators
    community.moderators = community.moderators.filter(
      (mod) => mod.toString() !== memberId.toString()
    );

    // Update member role
    const member = community.members.find(
      (m) => m.user.toString() === memberId.toString()
    );

    if (member) {
      member.role = 'member';
    }

    await community.save();

    return await community.populate('moderators members.user', 'name email avatar');
  }

  // Remove member (moderator action)
  async removeMember(communityId, userId, memberId) {
    const community = await Community.findById(communityId);

    if (!community) {
      throw new Error('Community not found');
    }

    // Check if user is moderator
    const isModerator = community.moderators.some(
      (mod) => mod.toString() === userId.toString()
    );

    if (!isModerator) {
      throw new Error('Only moderators can remove members');
    }

    // Cannot remove creator
    if (community.creator.toString() === memberId.toString()) {
      throw new Error('Cannot remove community creator');
    }

    // Remove member
    community.members = community.members.filter(
      (member) => member.user.toString() !== memberId.toString()
    );

    // Remove from moderators if present
    community.moderators = community.moderators.filter(
      (mod) => mod.toString() !== memberId.toString()
    );

    community.stats.memberCount = community.members.length;

    await community.save();

    return await community.populate('members.user moderators', 'name email avatar');
  }

  // Search communities
  async searchCommunities(query) {
    const communities = await Community.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
      ],
      isPrivate: false,
    })
      .populate('creator', 'name email avatar')
      .select('-members')
      .limit(20);

    return communities;
  }
}

module.exports = new CommunityService();
