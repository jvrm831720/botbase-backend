/**
 * Billing Module
 * Handles usage tracking, cost calculation, and plan enforcement
 */

import * as db from './db';
import type { PlanType } from '@shared/types';

const MONTHLY_RESET_DAY = parseInt(process.env.MONTHLY_RESET_DAY || '1');
const FREE_PLAN_CHATBOTS = parseInt(process.env.FREE_PLAN_CHATBOTS || '3');
const FREE_PLAN_MESSAGES_MINI = parseInt(process.env.FREE_PLAN_MESSAGES_MINI || '1000');
const FREE_PLAN_MESSAGES_PREMIUM = parseInt(process.env.FREE_PLAN_MESSAGES_PREMIUM || '100');
const FREE_PLAN_INDEXED_PAGES = parseInt(process.env.FREE_PLAN_INDEXED_PAGES || '100');
const COST_PER_MESSAGE_MINI = parseFloat(process.env.COST_PER_MESSAGE_MINI || '0.001');
const COST_PER_MESSAGE_PREMIUM = parseFloat(process.env.COST_PER_MESSAGE_PREMIUM || '0.01');
const COST_PER_INDEXED_PAGE = parseFloat(process.env.COST_PER_INDEXED_PAGE || '0.001');

// ============================================================================
// PLAN MANAGEMENT
// ============================================================================

/**
 * Get plan limits
 */
export function getPlanLimits(planType: PlanType) {
  const limits: Record<PlanType, any> = {
    free: {
      chatbots: FREE_PLAN_CHATBOTS,
      messagesPerModelMini: FREE_PLAN_MESSAGES_MINI,
      messagesPerModelPremium: FREE_PLAN_MESSAGES_PREMIUM,
      indexedPages: FREE_PLAN_INDEXED_PAGES,
    },
    pro: {
      chatbots: 50,
      messagesPerModelMini: 100000,
      messagesPerModelPremium: 10000,
      indexedPages: 10000,
    },
    enterprise: {
      chatbots: -1, // Unlimited
      messagesPerModelMini: -1,
      messagesPerModelPremium: -1,
      indexedPages: -1,
    },
  };

  return limits[planType] || limits.free;
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Check if usage is within limits
 */
export async function checkUsageLimits(
  userId: number,
  projectId: number,
  planType: PlanType
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = getPlanLimits(planType);
  const month = getCurrentMonth();

  try {
    const usage = await db.getOrCreateUsageTracking(userId, projectId, month);

    // Check message limits
    if (
      limits.messagesPerModelMini > 0 &&
      usage.messagesUsedMini >= limits.messagesPerModelMini
    ) {
      return {
        allowed: false,
        reason: 'Mini model message limit exceeded',
      };
    }

    if (
      limits.messagesPerModelPremium > 0 &&
      usage.messagesUsedPremium >= limits.messagesPerModelPremium
    ) {
      return {
        allowed: false,
        reason: 'Premium model message limit exceeded',
      };
    }

    // Check indexed pages limit
    if (limits.indexedPages > 0 && usage.indexedPagesUsed >= limits.indexedPages) {
      return {
        allowed: false,
        reason: 'Indexed pages limit exceeded',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[Billing] Usage check failed:', error);
    return { allowed: true }; // Allow on error
  }
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * Track message usage
 */
export async function trackMessageUsage(
  userId: number,
  projectId: number,
  model: 'mini' | 'premium',
  tokensUsed: number
): Promise<void> {
  const month = getCurrentMonth();

  try {
    const usage = await db.getOrCreateUsageTracking(userId, projectId, month);
    const cost = model === 'mini' ? COST_PER_MESSAGE_MINI : COST_PER_MESSAGE_PREMIUM;

    const updates: any = {};

    if (model === 'mini') {
      updates.messagesUsedMini = (usage.messagesUsedMini || 0) + 1;
      updates.costMini = (parseFloat(usage.costMini || '0') + cost).toFixed(4);
    } else {
      updates.messagesUsedPremium = (usage.messagesUsedPremium || 0) + 1;
      updates.costPremium = (parseFloat(usage.costPremium || '0') + cost).toFixed(4);
    }

    const totalCost =
      parseFloat(updates.costMini || usage.costMini || '0') +
      parseFloat(updates.costPremium || usage.costPremium || '0') +
      parseFloat(usage.costIndexedPages || '0');

    updates.totalCost = totalCost.toFixed(4);

    await db.updateUsageTracking(usage.id, updates);

    // Log billing event
    await db.createBillingEvent({
      userId,
      projectId,
      type: 'message',
      model,
      quantity: 1,
      cost: cost.toString(),
      metadata: {
        tokensUsed,
      },
    });
  } catch (error) {
    console.error('[Billing] Track message usage failed:', error);
  }
}

/**
 * Track indexed pages usage
 */
export async function trackIndexedPages(
  userId: number,
  projectId: number,
  pageCount: number
): Promise<void> {
  const month = getCurrentMonth();

  try {
    const usage = await db.getOrCreateUsageTracking(userId, projectId, month);
    const cost = pageCount * COST_PER_INDEXED_PAGE;

    const updates: any = {
      indexedPagesUsed: (usage.indexedPagesUsed || 0) + pageCount,
      costIndexedPages: (parseFloat(usage.costIndexedPages || '0') + cost).toFixed(4),
    };

    const totalCost =
      parseFloat(usage.costMini || '0') +
      parseFloat(usage.costPremium || '0') +
      parseFloat(updates.costIndexedPages);

    updates.totalCost = totalCost.toFixed(4);

    await db.updateUsageTracking(usage.id, updates);

    // Log billing event
    await db.createBillingEvent({
      userId,
      projectId,
      type: 'indexed_page',
      quantity: pageCount,
      cost: cost.toFixed(4),
      metadata: {
        costPerPage: COST_PER_INDEXED_PAGE,
      },
    });
  } catch (error) {
    console.error('[Billing] Track indexed pages failed:', error);
  }
}

/**
 * Get usage summary for user
 */
export async function getUserUsageSummary(
  userId: number,
  projectId: number
): Promise<{
  month: string;
  messagesUsedMini: number;
  messagesUsedPremium: number;
  indexedPagesUsed: number;
  totalCost: string;
  limits: any;
}> {
  const month = getCurrentMonth();

  try {
    const usage = await db.getOrCreateUsageTracking(userId, projectId, month);
    const project = await db.getProjectById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const limits = getPlanLimits('free'); // TODO: Get actual plan type

    return {
      month,
      messagesUsedMini: usage.messagesUsedMini || 0,
      messagesUsedPremium: usage.messagesUsedPremium || 0,
      indexedPagesUsed: usage.indexedPagesUsed || 0,
      totalCost: (usage.totalCost || '0').toString(),
      limits,
    };
  } catch (error) {
    console.error('[Billing] Get usage summary failed:', error);
    throw error;
  }
}

// ============================================================================
// BILLING EVENTS
// ============================================================================

/**
 * Get billing history
 */
export async function getBillingHistory(
  userId: number,
  limit: number = 50
): Promise<any[]> {
  try {
    return db.getUserBillingEvents(userId, limit);
  } catch (error) {
    console.error('[Billing] Get history failed:', error);
    return [];
  }
}

/**
 * Calculate total spent in period
 */
export async function getTotalSpent(
  userId: number,
  projectId: number,
  month: string
): Promise<string> {
  try {
    const usage = await db.getOrCreateUsageTracking(userId, projectId, month);
    return (usage.totalCost || '0').toString();
  } catch (error) {
    console.error('[Billing] Get total spent failed:', error);
    return '0';
  }
}
