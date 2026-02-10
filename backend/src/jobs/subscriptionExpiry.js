const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { GRACE_PERIOD_DAYS } = require('../config/plans');

let task = null;

/**
 * Downgrade expired subscriptions.
 *
 * Runs every hour. Finds subscriptions where:
 *  1. cancelAtPeriodEnd === true  AND  currentPeriodEnd + grace period has passed
 *  2. status === 'active' AND currentPeriodEnd + grace period has passed (payment lapsed)
 *
 * Sets plan → 'free', status → 'expired', and updates User.subscriptionTier.
 */
async function processExpiredSubscriptions() {
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - GRACE_PERIOD_DAYS);

  try {
    // Find subscriptions that are past their period end + grace window
    const expiredSubs = await Subscription.find({
      plan: { $ne: 'free' },
      status: { $in: ['active', 'trialing'] },
      currentPeriodEnd: { $lt: graceCutoff },
      $or: [
        { cancelAtPeriodEnd: true },
        // Also catch non-renewed subs (payment didn't come through)
        { cancelAtPeriodEnd: { $ne: true } },
      ],
    });

    if (expiredSubs.length === 0) return;

    console.log(`[subscriptionExpiry] Found ${expiredSubs.length} expired subscription(s) to downgrade.`);

    for (const sub of expiredSubs) {
      try {
        const oldPlan = sub.plan;
        sub.plan = 'free';
        sub.status = 'expired';
        sub.cancelAtPeriodEnd = false;
        await sub.save();

        await User.findByIdAndUpdate(sub.user, { subscriptionTier: 'free' });

        console.log(
          `[subscriptionExpiry] Downgraded user ${sub.user} from ${oldPlan} → free ` +
            `(periodEnd: ${sub.currentPeriodEnd?.toISOString()}).`
        );
      } catch (err) {
        console.error(`[subscriptionExpiry] Error downgrading subscription ${sub._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[subscriptionExpiry] Error running expiry check:', err.message);
  }
}

/**
 * Start the cron job — runs every hour at minute 0.
 */
function startSubscriptionExpiryJob() {
  // Run once on startup to catch anything missed while server was down
  processExpiredSubscriptions();

  // Then schedule hourly
  task = cron.schedule('0 * * * *', processExpiredSubscriptions, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('[subscriptionExpiry] Cron job started (hourly).');
}

/**
 * Stop the cron job gracefully.
 */
function stopSubscriptionExpiryJob() {
  if (task) {
    task.stop();
    task = null;
    console.log('[subscriptionExpiry] Cron job stopped.');
  }
}

module.exports = {
  startSubscriptionExpiryJob,
  stopSubscriptionExpiryJob,
  processExpiredSubscriptions, // exported for testing
};
