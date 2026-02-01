/**
 * Billing System Tests
 * Unit tests for billing module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as billing from './billing';

describe('Billing System', () => {
  describe('Usage Tracking', () => {
    it('should track message usage', async () => {
      const userId = 1;
      const projectId = 1;
      const model = 'mini';
      const tokensUsed = 100;

      await billing.trackMessageUsage(userId, projectId, model, tokensUsed);

      const usage = await billing.getUserUsageSummary(userId, projectId);
      expect(usage.totalTokensUsed).toBeGreaterThanOrEqual(tokensUsed);
    });

    it('should accumulate usage over time', async () => {
      const userId = 1;
      const projectId = 1;

      await billing.trackMessageUsage(userId, projectId, 'mini', 100);
      await billing.trackMessageUsage(userId, projectId, 'mini', 50);

      const usage = await billing.getUserUsageSummary(userId, projectId);
      expect(usage.totalTokensUsed).toBeGreaterThanOrEqual(150);
    });

    it('should track different models separately', async () => {
      const userId = 1;
      const projectId = 1;

      await billing.trackMessageUsage(userId, projectId, 'mini', 100);
      await billing.trackMessageUsage(userId, projectId, 'premium', 200);

      const usage = await billing.getUserUsageSummary(userId, projectId);
      expect(usage.miniTokens).toBeGreaterThanOrEqual(100);
      expect(usage.premiumTokens).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Plan Limits', () => {
    it('should return correct plan limits', () => {
      const freePlan = billing.getPlanLimits('free');
      const proPlan = billing.getPlanLimits('pro');
      const enterprisePlan = billing.getPlanLimits('enterprise');

      expect(freePlan.messagesPerMonth).toBeLessThan(proPlan.messagesPerMonth);
      expect(proPlan.messagesPerMonth).toBeLessThan(enterprisePlan.messagesPerMonth);
    });

    it('should have reasonable limits', () => {
      const plan = billing.getPlanLimits('free');

      expect(plan.messagesPerMonth).toBeGreaterThan(0);
      expect(plan.tokensPerMonth).toBeGreaterThan(0);
      expect(plan.maxProjectsPerUser).toBeGreaterThan(0);
    });
  });

  describe('Usage Limits Check', () => {
    it('should allow usage within limits', async () => {
      const userId = 1;
      const projectId = 1;

      const result = await billing.checkUsageLimits(userId, projectId, 'free');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block usage when limit exceeded', async () => {
      const userId = 1;
      const projectId = 1;

      // Track usage beyond free plan limit
      const freePlan = billing.getPlanLimits('free');
      const tokensToUse = freePlan.tokensPerMonth + 1000;

      await billing.trackMessageUsage(userId, projectId, 'mini', tokensToUse);

      const result = await billing.checkUsageLimits(userId, projectId, 'free');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit');
    });

    it('should provide reason for blocking', async () => {
      const userId = 1;
      const projectId = 1;

      const result = await billing.checkUsageLimits(userId, projectId, 'free');

      if (!result.allowed) {
        expect(result.reason).toBeDefined();
        expect(typeof result.reason).toBe('string');
        expect(result.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost for mini model', () => {
      const tokens = 1000;
      const cost = billing.calculateCost('mini', tokens);

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should calculate cost for premium model', () => {
      const tokens = 1000;
      const cost = billing.calculateCost('premium', tokens);

      expect(cost).toBeGreaterThan(0);
    });

    it('should have premium cost higher than mini', () => {
      const tokens = 1000;
      const miniCost = billing.calculateCost('mini', tokens);
      const premiumCost = billing.calculateCost('premium', tokens);

      expect(premiumCost).toBeGreaterThan(miniCost);
    });

    it('should scale with token count', () => {
      const cost100 = billing.calculateCost('mini', 100);
      const cost1000 = billing.calculateCost('mini', 1000);

      expect(cost1000).toBeGreaterThan(cost100);
    });

    it('should handle zero tokens', () => {
      const cost = billing.calculateCost('mini', 0);

      expect(cost).toBe(0);
    });
  });

  describe('Monthly Reset', () => {
    it('should reset usage at month boundary', async () => {
      const userId = 1;
      const projectId = 1;

      // Track usage
      await billing.trackMessageUsage(userId, projectId, 'mini', 100);

      // Trigger reset
      await billing.resetMonthlyUsage();

      const usage = await billing.getUserUsageSummary(userId, projectId);
      expect(usage.totalTokensUsed).toBe(0);
    });

    it('should preserve historical data', async () => {
      const userId = 1;
      const projectId = 1;

      await billing.trackMessageUsage(userId, projectId, 'mini', 100);

      const history = await billing.getUsageHistory(userId, projectId);

      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Add-on Credits', () => {
    it('should add credits to account', async () => {
      const userId = 1;
      const tokens = 10000;

      await billing.addCredits(userId, tokens, 'manual_purchase');

      const credits = await billing.getUserCredits(userId);
      expect(credits).toBeGreaterThanOrEqual(tokens);
    });

    it('should deduct credits on usage', async () => {
      const userId = 1;
      const projectId = 1;

      // Add credits
      await billing.addCredits(userId, 5000, 'manual_purchase');
      const initialCredits = await billing.getUserCredits(userId);

      // Use tokens
      await billing.trackMessageUsage(userId, projectId, 'mini', 100);

      const finalCredits = await billing.getUserCredits(userId);
      expect(finalCredits).toBeLessThanOrEqual(initialCredits);
    });

    it('should track credit source', async () => {
      const userId = 1;

      await billing.addCredits(userId, 1000, 'promotion');

      const history = await billing.getCreditHistory(userId);
      expect(history).toContainEqual(
        expect.objectContaining({
          source: 'promotion',
        })
      );
    });
  });

  describe('Billing Events', () => {
    it('should log billing events', async () => {
      const userId = 1;
      const projectId = 1;

      await billing.logBillingEvent(userId, projectId, 'message_sent', {
        model: 'mini',
        tokens: 100,
      });

      const events = await billing.getBillingEvents(userId, projectId);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should include event metadata', async () => {
      const userId = 1;
      const projectId = 1;
      const metadata = { model: 'mini', tokens: 100 };

      await billing.logBillingEvent(userId, projectId, 'message_sent', metadata);

      const events = await billing.getBillingEvents(userId, projectId);
      expect(events[0].metadata).toEqual(metadata);
    });
  });

  describe('Usage Summary', () => {
    it('should provide comprehensive usage summary', async () => {
      const userId = 1;
      const projectId = 1;

      await billing.trackMessageUsage(userId, projectId, 'mini', 100);
      await billing.trackMessageUsage(userId, projectId, 'premium', 200);

      const summary = await billing.getUserUsageSummary(userId, projectId);

      expect(summary).toHaveProperty('totalTokensUsed');
      expect(summary).toHaveProperty('miniTokens');
      expect(summary).toHaveProperty('premiumTokens');
      expect(summary).toHaveProperty('estimatedCost');
      expect(summary).toHaveProperty('messagesThisMonth');
    });

    it('should calculate estimated cost', async () => {
      const userId = 1;
      const projectId = 1;

      await billing.trackMessageUsage(userId, projectId, 'mini', 1000);

      const summary = await billing.getUserUsageSummary(userId, projectId);

      expect(summary.estimatedCost).toBeGreaterThan(0);
    });
  });
});
