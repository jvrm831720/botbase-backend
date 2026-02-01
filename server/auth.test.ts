/**
 * Authentication Tests
 * Unit tests for auth module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as auth from './auth';
import * as db from './db';

// Mock database module
vi.mock('./db', () => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  createRefreshToken: vi.fn(),
  getRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
}));

describe('Authentication Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'test@Password123';
      const hash = await auth.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should verify correct password', async () => {
      const password = 'test@Password123';
      const hash = await auth.hashPassword(password);
      const isValid = await auth.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'test@Password123';
      const hash = await auth.hashPassword(password);
      const isValid = await auth.verifyPassword('wrongPassword', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate access token', async () => {
      const token = await auth.generateAccessToken({
        id: 1,
        email: 'test@example.com',
        role: 'user',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format
    });

    it('should generate refresh token', async () => {
      const token = await auth.generateRefreshToken({
        id: 1,
        email: 'test@example.com',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify valid access token', async () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = await auth.generateAccessToken(payload);
      const verified = await auth.verifyAccessToken(token);

      expect(verified).toBeDefined();
      expect(verified.id).toBe(payload.id);
      expect(verified.email).toBe(payload.email);
    });

    it('should reject invalid access token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(auth.verifyAccessToken(invalidToken)).rejects.toThrow();
    });

    it('should reject expired access token', async () => {
      // Create token with very short expiry
      const token = await auth.generateAccessToken(
        {
          id: 1,
          email: 'test@example.com',
          role: 'user',
        },
        '1ms'
      );

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 10));

      await expect(auth.verifyAccessToken(token)).rejects.toThrow();
    });
  });

  describe('Input Sanitization', () => {
    it('should remove code blocks from input', () => {
      const input = 'Hello ```python\nprint("test")\n``` world';
      const sanitized = auth.sanitizeUserInput(input);

      expect(sanitized).not.toContain('```');
      expect(sanitized).not.toContain('print');
    });

    it('should remove template syntax', () => {
      const input = 'Hello {{name}} and ${value}';
      const sanitized = auth.sanitizeUserInput(input);

      expect(sanitized).not.toContain('{{');
      expect(sanitized).not.toContain('${');
    });

    it('should limit input length', () => {
      const longInput = 'a'.repeat(10000);
      const sanitized = auth.sanitizeUserInput(longInput);

      expect(sanitized.length).toBeLessThanOrEqual(5000);
    });

    it('should preserve normal text', () => {
      const input = 'This is normal text with no special content';
      const sanitized = auth.sanitizeUserInput(input);

      expect(sanitized).toBe(input);
    });
  });

  describe('Rate Limiting', () => {
    it('should track login attempts', async () => {
      const email = 'test@example.com';

      // First attempt should succeed
      let canAttempt = await auth.checkLoginAttempts(email);
      expect(canAttempt).toBe(true);

      // Record failed attempt
      await auth.recordFailedLoginAttempt(email);

      // Should still allow attempts initially
      canAttempt = await auth.checkLoginAttempts(email);
      expect(canAttempt).toBe(true);
    });

    it('should block after too many failed attempts', async () => {
      const email = 'test@example.com';

      // Record 6 failed attempts
      for (let i = 0; i < 6; i++) {
        await auth.recordFailedLoginAttempt(email);
      }

      // Should now block
      const canAttempt = await auth.checkLoginAttempts(email);
      expect(canAttempt).toBe(false);
    });

    it('should reset attempts on successful login', async () => {
      const email = 'test@example.com';

      // Record failed attempts
      await auth.recordFailedLoginAttempt(email);
      await auth.recordFailedLoginAttempt(email);

      // Reset on successful login
      await auth.resetLoginAttempts(email);

      // Should allow attempts again
      const canAttempt = await auth.checkLoginAttempts(email);
      expect(canAttempt).toBe(true);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com',
      ];

      validEmails.forEach((email) => {
        expect(() => auth.validateEmail(email)).not.toThrow();
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'invalid @example.com',
      ];

      invalidEmails.forEach((email) => {
        expect(() => auth.validateEmail(email)).toThrow();
      });
    });
  });

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecurePassword2024',
        'P@ssw0rd!Secure',
      ];

      strongPasswords.forEach((password) => {
        expect(() => auth.validatePassword(password)).not.toThrow();
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'short',
        '12345678',
        'password',
        'abc',
      ];

      weakPasswords.forEach((password) => {
        expect(() => auth.validatePassword(password)).toThrow();
      });
    });

    it('should require minimum length', () => {
      expect(() => auth.validatePassword('Pass1')).toThrow();
    });
  });
});
