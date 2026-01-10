const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    avatar: {
      type: String,
    },
    banner: {
      type: String,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        role: {
          type: String,
          enum: ['moderator', 'member'],
          default: 'member',
        },
      },
    ],
    category: {
      type: String,
      enum: ['education', 'technology', 'science', 'arts', 'health', 'business', 'entertainment', 'sports', 'other'],
      required: true,
    },
    tags: [String],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    rules: [
      {
        title: String,
        description: String,
      },
    ],
    settings: {
      allowPosts: {
        type: Boolean,
        default: true,
      },
      allowComments: {
        type: Boolean,
        default: true,
      },
      allowPolls: {
        type: Boolean,
        default: true,
      },
    },
    stats: {
      memberCount: {
        type: Number,
        default: 0,
      },
      postCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
communitySchema.index({ creator: 1 });
communitySchema.index({ category: 1 });
communitySchema.index({ 'members.user': 1 });
communitySchema.index({ name: 'text', description: 'text', tags: 'text' });

// Generate slug from name
communitySchema.pre('validate', function () {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
});

const Community = mongoose.model('Community', communitySchema);

module.exports = Community;
