/**
 * Single source of truth for all subscription plan configuration.
 * Every module (middleware, models, services) should import from here.
 *
 * TIER HIERARCHY: free < starter < pro < unlimited
 *
 * RULE: Every limit listed here MUST be enforced in code.
 * Do NOT add cosmetic/unenforceable features (e.g. "priority support").
 *
 * COST BASIS (Feb 2026):
 *   Groq LLM chat       → FREE (rate-limited)
 *   OpenAI Embeddings    → ~$0.00002/query
 *   OpenAI Whisper (STT) → $0.006/min
 *   OpenAI TTS           → $0.015/1K chars
 *   Tavily web search    → $0.004/search
 *   Voice turn total     → ~₹1.4/turn
 */

const TIER_ORDER = ['free', 'starter', 'pro', 'unlimited'];

/**
 * Feature limits per plan.
 * -1 means unlimited.
 *
 * ENFORCED BY:
 *   aiQuestionsPerDay  → checkAIUsageLimit middleware
 *   voiceTurnsPerDay   → checkAIUsageLimit middleware (type: 'voice-tutor')
 *   boards             → checkBoardLimit middleware
 *   notebooks          → checkNotebookLimit middleware
 *   groupMembers       → group.service.js addMember/joinGroupWithCode
 *   storageGB          → checkStorageLimit middleware + storageUsed tracking
 *   fileUploadsPerDay  → checkFileUploadLimit middleware
 */
const PLAN_LIMITS = {
  free: {
    aiQuestionsPerDay: 10,
    voiceTurnsPerDay: 0,     // Voice Tutor is paid-only
    boards: 1,
    notebooks: 3,
    groupMembers: 5,
    storageGB: 0.1,          // 100 MB
    fileUploadsPerDay: 5,
  },
  starter: {
    aiQuestionsPerDay: 50,
    voiceTurnsPerDay: 10,    // ~₹14/day cost cap
    boards: 5,
    notebooks: 20,
    groupMembers: 20,
    storageGB: 2,
    fileUploadsPerDay: 50,
  },
  pro: {
    aiQuestionsPerDay: -1,   // unlimited
    voiceTurnsPerDay: 50,    // ~₹70/day cost cap
    boards: -1,
    notebooks: -1,
    groupMembers: 50,
    storageGB: 25,
    fileUploadsPerDay: -1,
  },
  unlimited: {
    aiQuestionsPerDay: -1,
    voiceTurnsPerDay: -1,    // truly unlimited
    boards: -1,
    notebooks: -1,
    groupMembers: -1,
    storageGB: 500,
    fileUploadsPerDay: -1,
  },
};

/**
 * Razorpay subscription plan IDs & pricing.
 * Amounts are in paise (₹1 = 100 paise).
 */
const RAZORPAY_PLANS = {
  starter_monthly: {
    tier: 'starter',
    name: 'Starter Plan - Monthly',
    amount: 4900,  // ₹49
    currency: 'INR',
    interval: 'monthly',
    period: 1,
    description: '50 AI questions/day, 10 voice turns/day, 5 boards, 2GB storage',
  },
  starter_yearly: {
    tier: 'starter',
    name: 'Starter Plan - Yearly',
    amount: 49900, // ₹499  (~15% off vs monthly)
    currency: 'INR',
    interval: 'yearly',
    period: 1,
    description: 'Starter plan — save 15% with yearly billing',
  },
  pro_monthly: {
    tier: 'pro',
    name: 'Pro Plan - Monthly',
    amount: 14900, // ₹149
    currency: 'INR',
    interval: 'monthly',
    period: 1,
    description: 'Unlimited AI, 50 voice turns/day, unlimited boards, 25GB storage',
  },
  pro_yearly: {
    tier: 'pro',
    name: 'Pro Plan - Yearly',
    amount: 149900, // ₹1,499  (~16% off vs monthly)
    currency: 'INR',
    interval: 'yearly',
    period: 1,
    description: 'Pro plan — save 16% with yearly billing',
  },
  unlimited_monthly: {
    tier: 'unlimited',
    name: 'Unlimited Plan - Monthly',
    amount: 49900, // ₹499
    currency: 'INR',
    interval: 'monthly',
    period: 1,
    description: 'Everything unlimited, 500GB storage',
  },
  unlimited_yearly: {
    tier: 'unlimited',
    name: 'Unlimited Plan - Yearly',
    amount: 499900, // ₹4,999  (~16% off vs monthly)
    currency: 'INR',
    interval: 'yearly',
    period: 1,
    description: 'Unlimited plan — save 16% with yearly billing',
  },
};

/**
 * One-time payment plans (legacy — kept for backward compat).
 */
const ONE_TIME_PLANS = {};

/**
 * Grace period (in days) after subscription expiry before downgrade.
 */
const GRACE_PERIOD_DAYS = 3;

/**
 * Helper: get limits for a plan tier (defaults to free).
 */
const getLimitsForTier = (tier) => {
  return PLAN_LIMITS[tier] || PLAN_LIMITS.free;
};

/**
 * Helper: check if tierA >= tierB in the hierarchy.
 */
const isTierAtLeast = (tierA, minTier) => {
  const a = TIER_ORDER.indexOf(tierA);
  const b = TIER_ORDER.indexOf(minTier);
  if (a === -1 || b === -1) return false;
  return a >= b;
};

/**
 * Helper: check if a limit value means unlimited.
 */
const isUnlimited = (value) => value === -1;

module.exports = {
  TIER_ORDER,
  PLAN_LIMITS,
  RAZORPAY_PLANS,
  ONE_TIME_PLANS,
  GRACE_PERIOD_DAYS,
  getLimitsForTier,
  isTierAtLeast,
  isUnlimited,
};
