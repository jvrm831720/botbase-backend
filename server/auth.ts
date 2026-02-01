/**
 * Authentication Module
 * Handles JWT generation, validation, and session management
 * Implements secure password hashing and token refresh logic
 */

import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';
import * as db from './db';
import type { JWTPayload, UserRole } from '@shared/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// ============================================================================
// PASSWORD HASHING
// ============================================================================

/**
 * Hash password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 * @param password - Plain text password
 * @param hash - Bcrypt hash
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================
// JWT TOKEN GENERATION
// ============================================================================

/**
 * Convert duration string to milliseconds
 * @param duration - Duration string (e.g., "24h", "7d", "30m")
 * @returns Milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const [, value, unit] = match;
  const num = parseInt(value);

  switch (unit) {
    case 's':
      return num * 1000;
    case 'm':
      return num * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

/**
 * Generate JWT access token
 * @param userId - User ID
 * @param email - User email
 * @param role - User role
 * @returns JWT token
 */
export async function generateAccessToken(
  userId: number,
  email: string,
  role: UserRole
): Promise<string> {
  const expiryMs = parseDuration(JWT_EXPIRY);
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    userId,
    email,
    role,
  } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + Math.floor(expiryMs / 1000))
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate refresh token and store in database
 * @param userId - User ID
 * @returns Refresh token
 */
export async function generateRefreshToken(userId: number): Promise<string> {
  const token = nanoid(64);
  const expiryMs = parseDuration(JWT_REFRESH_EXPIRY);
  const expiresAt = new Date(Date.now() + expiryMs);

  await db.createRefreshToken({
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Verify and decode JWT token
 * @param token - JWT token
 * @returns Decoded payload
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Verify and refresh token if needed
 * @param refreshToken - Refresh token
 * @returns New access token and refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const storedToken = await db.getRefreshToken(refreshToken);

  if (!storedToken) {
    throw new Error('Refresh token not found');
  }

  if (storedToken.revokedAt) {
    throw new Error('Refresh token has been revoked');
  }

  if (new Date() > storedToken.expiresAt) {
    throw new Error('Refresh token has expired');
  }

  const user = await db.getUserById(storedToken.userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Generate new tokens
  const newAccessToken = await generateAccessToken(user.id, user.email, user.role);
  const newRefreshToken = await generateRefreshToken(user.id);

  // Revoke old refresh token
  await db.revokeRefreshToken(refreshToken);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

// ============================================================================
// USER REGISTRATION & LOGIN
// ============================================================================

/**
 * Register new user
 * @param email - User email
 * @param password - User password
 * @param name - User name
 * @returns User object and tokens
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{
  user: Awaited<ReturnType<typeof db.getUserById>>;
  accessToken: string;
  refreshToken: string;
}> {
  // Validate input
  if (!email || !password || !name) {
    throw new Error('Email, password, and name are required');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Check if user already exists
  const existing = await db.getUserByEmail(email);
  if (existing) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await db.createUser({
    email,
    name,
    passwordHash,
    role: 'user',
    isActive: true,
    emailVerified: false,
  });

  // Generate tokens
  const accessToken = await generateAccessToken(user.id, user.email, user.role);
  const refreshToken = await generateRefreshToken(user.id);

  // Log audit event
  await db.createAuditLog({
    userId: user.id,
    action: 'auth.login',
    resourceType: 'user',
    resourceId: user.id.toString(),
    ipAddress: '0.0.0.0', // Will be set by middleware
  });

  return { user, accessToken, refreshToken };
}

/**
 * Login user
 * @param email - User email
 * @param password - User password
 * @returns User object and tokens
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{
  user: Awaited<ReturnType<typeof db.getUserById>>;
  accessToken: string;
  refreshToken: string;
}> {
  // Validate input
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Find user
  const user = await db.getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('User account is inactive');
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Update last signed in
  await db.updateUser(user.id, {
    lastSignedIn: new Date(),
  });

  // Generate tokens
  const accessToken = await generateAccessToken(user.id, user.email, user.role);
  const refreshToken = await generateRefreshToken(user.id);

  // Log audit event
  await db.createAuditLog({
    userId: user.id,
    action: 'auth.login',
    resourceType: 'user',
    resourceId: user.id.toString(),
    ipAddress: '0.0.0.0',
  });

  return { user, accessToken, refreshToken };
}

/**
 * Logout user (revoke refresh token)
 * @param refreshToken - Refresh token to revoke
 */
export async function logoutUser(refreshToken: string): Promise<void> {
  await db.revokeRefreshToken(refreshToken);

  // Log audit event would be done by the caller with user context
}

// ============================================================================
// AUTHORIZATION
// ============================================================================

/**
 * Check if user has permission to access resource
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns True if user owns the project
 */
export async function canAccessProject(userId: number, projectId: number): Promise<boolean> {
  const project = await db.getProjectById(projectId);
  if (!project) return false;
  return project.userId === userId;
}

/**
 * Check if user is admin
 * @param userId - User ID
 * @returns True if user is admin
 */
export async function isAdmin(userId: number): Promise<boolean> {
  const user = await db.getUserById(userId);
  if (!user) return false;
  return user.role === 'admin';
}

/**
 * Verify user can access document
 * @param userId - User ID
 * @param documentId - Document ID
 * @returns True if user can access document
 */
export async function canAccessDocument(userId: number, documentId: number): Promise<boolean> {
  const document = await db.getDocumentById(documentId);
  if (!document) return false;

  return canAccessProject(userId, document.projectId);
}

/**
 * Verify user can access conversation
 * @param userId - User ID
 * @param conversationId - Conversation ID
 * @returns True if user can access conversation
 */
export async function canAccessConversation(
  userId: number,
  conversationId: number
): Promise<boolean> {
  const conversation = await db.getConversationById(conversationId);
  if (!conversation) return false;

  return canAccessProject(userId, conversation.projectId);
}
