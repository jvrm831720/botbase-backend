/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

export type UserRole = 'admin' | 'user';

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// ============================================================================
// PROJECT & SOURCES
// ============================================================================

export type SourceType = 'url' | 'pdf' | 'text' | 'docx';

export interface ChatRequest {
  projectId: string;
  conversationId?: string;
  visitorId?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  message: string;
  model: 'mini' | 'premium';
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  sources: Array<{
    documentId: string;
    title: string;
    url?: string;
  }>;
  tokensUsed: number;
}

// ============================================================================
// USAGE & BILLING
// ============================================================================

export type PlanType = 'free' | 'pro' | 'enterprise';

// ============================================================================
// RAG PIPELINE
// ============================================================================

export interface ChunkingConfig {
  size: number;
  overlap: number;
  separator: string;
}

export interface EmbeddingConfig {
  model: string;
  batchSize: number;
  maxRetries: number;
}

export interface VectorSearchConfig {
  similarityThreshold: number;
  topK: number;
  maxContextTokens: number;
}

export interface RAGContext {
  chunks: Array<{
    content: string;
    similarity: number;
    documentId: string;
    title: string;
    url?: string;
  }>;
  totalTokens: number;
}

// ============================================================================
// ERRORS
// ============================================================================

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'USAGE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'RESOURCE_CONFLICT';

export interface ApiError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  requestId?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// EVENTS
// ============================================================================

export type EventType =
  | 'document.created'
  | 'document.processed'
  | 'document.failed'
  | 'conversation.created'
  | 'message.sent'
  | 'lead.captured'
  | 'usage.tracked'
  | 'billing.event'
  | 'project.created'
  | 'project.deleted';

// ============================================================================
// WORKER JOBS
// ============================================================================

export type JobType =
  | 'crawl_website'
  | 'process_pdf'
  | 'process_text'
  | 'generate_embeddings'
  | 'cleanup_expired_data';

// ============================================================================
// AUDIT LOG
// ============================================================================

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'document.upload'
  | 'document.delete'
  | 'message.send'
  | 'usage.tracked'
  | 'billing.charged';
