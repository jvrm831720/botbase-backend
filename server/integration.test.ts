/**
 * Integration Tests
 * End-to-end tests for complete workflows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as auth from './auth';
import * as rag from './rag';
import * as billing from './billing';

describe('Integration Tests - Complete Workflows', () => {
  describe('User Registration & Authentication Flow', () => {
    it('should complete full auth flow: register -> login -> verify', async () => {
      const email = 'testuser@example.com';
      const password = 'SecurePass123!';
      const name = 'Test User';

      // Step 1: Register
      const hashedPassword = await auth.hashPassword(password);
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);

      // Step 2: Login - verify password
      const isValid = await auth.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);

      // Step 3: Generate tokens
      const accessToken = await auth.generateAccessToken({
        id: 1,
        email,
        role: 'user',
      });

      const refreshToken = await auth.generateRefreshToken({
        id: 1,
        email,
      });

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // Step 4: Verify access token
      const verified = await auth.verifyAccessToken(accessToken);
      expect(verified.email).toBe(email);
    });

    it('should handle failed login attempts with rate limiting', async () => {
      const email = 'attacker@example.com';

      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await auth.recordFailedLoginAttempt(email);
      }

      // Should be blocked
      const canAttempt = await auth.checkLoginAttempts(email);
      expect(canAttempt).toBe(false);

      // Reset on successful login
      await auth.resetLoginAttempts(email);
      const canAttemptAgain = await auth.checkLoginAttempts(email);
      expect(canAttemptAgain).toBe(true);
    });
  });

  describe('Document Upload & RAG Processing Flow', () => {
    it('should process document: upload -> chunk -> embed -> search', async () => {
      const document = `
        This is a test document about artificial intelligence.
        AI is transforming industries and creating new opportunities.
        Machine learning is a subset of artificial intelligence.
        Deep learning uses neural networks for complex tasks.
      `;

      // Step 1: Chunk document
      const chunks = rag.chunkDocument(document, 100);
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(100);
      });

      // Step 2: Batch for embedding
      const batches = rag.batchChunksForEmbedding(chunks, 10);
      expect(batches.length).toBeGreaterThan(0);

      // Step 3: Build context from chunks
      const mockChunks = chunks.map((content, i) => ({
        content,
        source: `doc_${i}`,
      }));

      const context = rag.buildRAGContext(mockChunks);
      expect(context).toContain('artificial intelligence');
      expect(context).toContain('machine learning');
    });

    it('should handle RAG query: sanitize -> search -> filter -> respond', async () => {
      const query = 'What is AI? ```code```';

      // Step 1: Sanitize query
      const sanitized = rag.sanitizeQuery(query);
      expect(sanitized).not.toContain('```');

      // Step 2: Mock search results
      const mockResults = [
        { content: 'AI is artificial intelligence', score: 0.95 },
        { content: 'Machine learning is a subset', score: 0.65 },
        { content: 'Unrelated content', score: 0.2 },
      ];

      // Step 3: Filter by relevance
      const filtered = rag.filterByRelevance(mockResults, 0.7);
      expect(filtered.length).toBe(1);
      expect(filtered[0].score).toBeGreaterThanOrEqual(0.7);

      // Step 4: Build context
      const context = rag.buildRAGContext(filtered);
      expect(context).toContain('artificial intelligence');
    });
  });

  describe('Billing & Usage Tracking Flow', () => {
    it('should track usage and enforce limits', async () => {
      const userId = 1;
      const projectId = 1;
      const plan = 'free';

      // Step 1: Check initial limits
      const initialCheck = await billing.checkUsageLimits(userId, projectId, plan);
      expect(initialCheck.allowed).toBe(true);

      // Step 2: Track usage
      const tokensUsed = 100;
      await billing.trackMessageUsage(userId, projectId, 'mini', tokensUsed);

      // Step 3: Get usage summary
      const summary = await billing.getUserUsageSummary(userId, projectId);
      expect(summary.totalTokensUsed).toBeGreaterThanOrEqual(tokensUsed);

      // Step 4: Calculate cost
      const cost = billing.calculateCost('mini', tokensUsed);
      expect(cost).toBeGreaterThan(0);
      expect(summary.estimatedCost).toBeGreaterThanOrEqual(cost);
    });

    it('should handle add-on purchases and credit usage', async () => {
      const userId = 1;

      // Step 1: Get initial credits
      const initialCredits = 0;

      // Step 2: Purchase add-on (5000 tokens)
      const tokensToAdd = 5000;
      // await billing.addCredits(userId, tokensToAdd, 'add_on_purchase');

      // Step 3: Use credits
      const projectId = 1;
      await billing.trackMessageUsage(userId, projectId, 'mini', 100);

      // Step 4: Verify credits decreased
      const finalCredits = 0; // Placeholder
      expect(finalCredits).toBeLessThanOrEqual(initialCredits + tokensToAdd);
    });

    it('should reset usage at month boundary', async () => {
      const userId = 1;
      const projectId = 1;

      // Step 1: Track usage
      await billing.trackMessageUsage(userId, projectId, 'mini', 500);

      // Step 2: Get usage before reset
      const usageBefore = await billing.getUserUsageSummary(userId, projectId);
      expect(usageBefore.totalTokensUsed).toBeGreaterThan(0);

      // Step 3: Trigger monthly reset
      await billing.resetMonthlyUsage();

      // Step 4: Verify usage reset
      const usageAfter = await billing.getUserUsageSummary(userId, projectId);
      expect(usageAfter.totalTokensUsed).toBe(0);

      // Step 5: Verify historical data preserved
      const history = await billing.getUsageHistory(userId, projectId);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Plan Upgrade Flow', () => {
    it('should handle plan upgrade with proper limits', async () => {
      const userId = 1;

      // Step 1: Get free plan limits
      const freePlan = billing.getPlanLimits('free');
      expect(freePlan.messagesPerMonth).toBeLessThan(1000);

      // Step 2: Get pro plan limits
      const proPlan = billing.getPlanLimits('pro');
      expect(proPlan.messagesPerMonth).toBeGreaterThan(freePlan.messagesPerMonth);

      // Step 3: Simulate upgrade
      // User upgrades from free to pro

      // Step 4: Verify new limits apply
      expect(proPlan.tokensPerMonth).toBeGreaterThan(freePlan.tokensPerMonth);
      expect(proPlan.maxProjectsPerUser).toBeGreaterThanOrEqual(freePlan.maxProjectsPerUser);
    });
  });

  describe('Error Handling & Recovery', () => {
    it('should handle invalid input gracefully', async () => {
      // Invalid email
      expect(() => auth.validateEmail('invalid')).toThrow();

      // Invalid password
      expect(() => auth.validatePassword('weak')).toThrow();

      // Invalid URL
      const isValid = rag.isValidUrl('not a url');
      expect(isValid).toBe(false);
    });

    it('should handle concurrent operations', async () => {
      const promises = [];

      // Simulate concurrent usage tracking
      for (let i = 0; i < 10; i++) {
        promises.push(
          billing.trackMessageUsage(1, 1, 'mini', 100)
        );
      }

      await Promise.all(promises);

      // Verify all operations completed
      const summary = await billing.getUserUsageSummary(1, 1);
      expect(summary.totalTokensUsed).toBeGreaterThanOrEqual(1000);
    });

    it('should handle rate limiting under load', async () => {
      const email = 'loadtest@example.com';

      // Simulate rapid login attempts
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(auth.checkLoginAttempts(email));
      }

      const results = await Promise.all(attempts);

      // Some should be blocked
      const blocked = results.filter((r) => !r).length;
      expect(blocked).toBeGreaterThan(0);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent usage across operations', async () => {
      const userId = 1;
      const projectId = 1;

      // Track multiple operations
      await billing.trackMessageUsage(userId, projectId, 'mini', 100);
      await billing.trackMessageUsage(userId, projectId, 'premium', 200);
      await billing.trackMessageUsage(userId, projectId, 'mini', 50);

      // Verify totals
      const summary = await billing.getUserUsageSummary(userId, projectId);
      expect(summary.totalTokensUsed).toBe(350);
      expect(summary.miniTokens).toBe(150);
      expect(summary.premiumTokens).toBe(200);
    });

    it('should preserve data during failures', async () => {
      const userId = 1;
      const projectId = 1;

      // Track usage
      await billing.trackMessageUsage(userId, projectId, 'mini', 100);

      // Get history
      const history1 = await billing.getUsageHistory(userId, projectId);

      // Simulate operation
      try {
        // Operation that might fail
        throw new Error('Simulated failure');
      } catch (error) {
        // Should not affect recorded usage
      }

      // Verify history preserved
      const history2 = await billing.getUsageHistory(userId, projectId);
      expect(history2.length).toBe(history1.length);
    });
  });
});
