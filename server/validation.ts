/**
 * Validation Schemas
 * Zod schemas for request/response validation
 */

import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').min(5).max(320),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(255),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  modelMini: z.string().default('gpt-4-turbo-preview'),
  modelPremium: z.string().default('gpt-4-turbo-preview'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  modelMini: z.string().optional(),
  modelPremium: z.string().optional(),
});

// ============================================================================
// SOURCE SCHEMAS
// ============================================================================

export const createSourceSchema = z.object({
  projectId: z.number().int().positive(),
  type: z.enum(['url', 'pdf', 'text', 'docx']),
  name: z.string().min(1).max(255),
  url: z.string().url().optional(),
});

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

export const uploadDocumentSchema = z.object({
  projectId: z.number().int().positive(),
  sourceId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(1000000),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ============================================================================
// CONVERSATION SCHEMAS
// ============================================================================

export const chatRequestSchema = z.object({
  projectId: z.number().int().positive(),
  conversationId: z.number().int().positive().optional(),
  visitorId: z.string().max(255).optional(),
  visitorEmail: z.string().email().optional(),
  visitorPhone: z.string().max(20).optional(),
  message: z.string().min(1).max(5000),
  model: z.enum(['mini', 'premium']),
});

// ============================================================================
// LEAD SCHEMAS
// ============================================================================

export const captureLeadSchema = z.object({
  projectId: z.number().int().positive(),
  conversationId: z.number().int().positive(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  name: z.string().max(255).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ============================================================================
// BILLING SCHEMAS
// ============================================================================

export const purchaseAddOnSchema = z.object({
  projectId: z.number().int().positive(),
  addOnId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

// ============================================================================
// ERROR RESPONSE SCHEMA
// ============================================================================

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.any()).optional(),
  }),
  requestId: z.string().optional(),
});

// ============================================================================
// SUCCESS RESPONSE SCHEMA
// ============================================================================

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
  requestId: z.string().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate data against schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.flatten();
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
  }

  return result.data;
}

/**
 * Create safe validator that returns errors instead of throwing
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: boolean; data?: T; errors?: any } => {
    const result = schema.safeParse(data);

    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten(),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  };
}

// Export types
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;
export type CreateSourceRequest = z.infer<typeof createSourceSchema>;
export type UploadDocumentRequest = z.infer<typeof uploadDocumentSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type CaptureLeadRequest = z.infer<typeof captureLeadSchema>;
export type PurchaseAddOnRequest = z.infer<typeof purchaseAddOnSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
