const Board = require('../models/Board');
const User = require('../models/User');
const AppError = require('../utils/AppError');

class BoardService {
  /**
   * Create a new board
   */
  async createBoard(userId, data) {
    const board = await Board.create({
      title: data.title,
      description: data.description,
      owner: userId,
      isPublic: data.isPublic || false,
      settings: data.settings || {},
      tags: data.tags || []
    });

    await board.populate('owner', 'name email');
    return board;
  }

  /**
   * Get all boards for a user
   */
  async getUserBoards(userId, options = {}) {
    const { 
      includeArchived = false, 
      isPublic = null,
      limit = 50,
      skip = 0,
      sortBy = 'lastActivity',
      sortOrder = 'desc'
    } = options;

    const query = {
      $or: [
        { owner: userId },
        { 'members.userId': userId }
      ]
    };

    if (!includeArchived) {
      query.isArchived = false;
    }

    if (isPublic !== null) {
      query.isPublic = isPublic;
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const boards = await Board.find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .populate('owner', 'name email')
      .populate('members.userId', 'name email')
      .select('-elements'); // Don't load all elements for list view

    const total = await Board.countDocuments(query);

    return { boards, total };
  }

  /**
   * Get a single board by ID
   */
  async getBoardById(boardId, userId) {
    const board = await Board.findById(boardId)
      .populate('owner', 'name email')
      .populate('members.userId', 'name email')
      .populate('elements.createdBy', 'name email');

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check access
    if (!board.hasAccess(userId)) {
      throw new AppError('Access denied', 403);
    }

    return board;
  }

  /**
   * Update board metadata
   */
  async updateBoard(boardId, userId, updates) {
    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Only owner can update board metadata
    if (board.owner.toString() !== userId.toString()) {
      throw new AppError('Only the board owner can update board settings', 403);
    }

    // Allowed fields to update
    const allowedUpdates = ['title', 'description', 'isPublic', 'settings', 'tags', 'thumbnail'];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        board[field] = updates[field];
      }
    });

    await board.save();
    await board.populate('owner', 'name email');
    await board.populate('members.userId', 'name email');

    return board;
  }

  /**
   * Delete a board
   */
  async deleteBoard(boardId, userId) {
    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Only owner can delete
    if (board.owner.toString() !== userId.toString()) {
      throw new AppError('Only the board owner can delete the board', 403);
    }

    await board.deleteOne();
    return { message: 'Board deleted successfully' };
  }

  /**
   * Archive/Unarchive a board
   */
  async archiveBoard(boardId, userId, archive = true) {
    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Only owner can archive
    if (board.owner.toString() !== userId.toString()) {
      throw new AppError('Only the board owner can archive the board', 403);
    }

    board.isArchived = archive;
    await board.save();

    return board;
  }

  /**
   * Add member to board
   */
  async addMember(boardId, userId, memberData) {
    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Only owner can add members
    if (board.owner.toString() !== userId.toString()) {
      throw new AppError('Only the board owner can add members', 403);
    }

    // Check if member already exists
    const memberExists = board.members.some(
      m => m.userId.toString() === memberData.userId.toString()
    );

    if (memberExists) {
      throw new AppError('User is already a member of this board', 400);
    }

    // Verify the user exists
    const user = await User.findById(memberData.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    board.members.push({
      userId: memberData.userId,
      role: memberData.role || 'editor'
    });

    await board.save();
    await board.populate('members.userId', 'name email');

    return board;
  }

  /**
   * Remove member from board
   */
  async removeMember(boardId, userId, memberUserId) {
    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Only owner can remove members
    if (board.owner.toString() !== userId.toString()) {
      throw new AppError('Only the board owner can remove members', 403);
    }

    // Cannot remove owner
    if (board.owner.toString() === memberUserId.toString()) {
      throw new AppError('Cannot remove the board owner', 400);
    }

    board.members = board.members.filter(
      m => m.userId.toString() !== memberUserId.toString()
    );

    await board.save();
    return board;
  }

  /**
   * Update member role
   */
  async updateMemberRole(boardId, userId, memberUserId, newRole) {
    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Only owner can update roles
    if (board.owner.toString() !== userId.toString()) {
      throw new AppError('Only the board owner can update member roles', 403);
    }

    const member = board.members.find(
      m => m.userId.toString() === memberUserId.toString()
    );

    if (!member) {
      throw new AppError('Member not found', 404);
    }

    member.role = newRole;
    await board.save();

    return board;
  }

  /**
   * Duplicate a board
   */
  async duplicateBoard(boardId, userId, newTitle) {
    const originalBoard = await Board.findById(boardId);

    if (!originalBoard) {
      throw new AppError('Board not found', 404);
    }

    // Check access
    if (!originalBoard.hasAccess(userId)) {
      throw new AppError('Access denied', 403);
    }

    // Create duplicate
    const duplicateData = originalBoard.toObject();
    delete duplicateData._id;
    delete duplicateData.__v;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    duplicateData.title = newTitle || `${originalBoard.title} (Copy)`;
    duplicateData.owner = userId;
    duplicateData.members = []; // New board starts with no members except owner
    duplicateData.lastActivity = new Date();

    const newBoard = await Board.create(duplicateData);
    await newBoard.populate('owner', 'name email');

    return newBoard;
  }

  /**
   * Search boards
   */
  async searchBoards(userId, searchQuery, options = {}) {
    const { limit = 20, skip = 0 } = options;

    const query = {
      $or: [
        { owner: userId },
        { 'members.userId': userId },
        { isPublic: true }
      ],
      isArchived: false,
      $text: { $search: searchQuery }
    };

    const boards = await Board.find(query)
      .sort({ score: { $meta: 'textScore' }, lastActivity: -1 })
      .limit(limit)
      .skip(skip)
      .populate('owner', 'name email')
      .select('-elements');

    return boards;
  }

  /**
   * Invite member by email
   */
  async inviteMemberByEmail(boardId, inviterId, email, role = 'editor') {
    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check if inviter has permission (owner or editor)
    const inviterRole = board.getUserRole(inviterId);
    if (inviterRole !== 'owner' && inviterRole !== 'editor') {
      throw new AppError('You do not have permission to invite members', 403);
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // TODO: Send invitation email for non-registered users
      return {
        message: 'Invitation email sent. User must register to join.',
        email,
        registered: false
      };
    }

    // Check if user is already a member
    const isAlreadyMember = board.owner.toString() === user._id.toString() ||
                           board.members.some(m => m.userId.toString() === user._id.toString());

    if (isAlreadyMember) {
      throw new AppError('User is already a member of this board', 400);
    }

    // Add user as member
    board.members.push({
      userId: user._id,
      role,
      joinedAt: new Date()
    });

    board.lastActivity = new Date();
    await board.save();

    // TODO: Send notification/email to user
    return {
      message: 'User added to board successfully',
      email,
      registered: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    };
  }
}

module.exports = new BoardService();
