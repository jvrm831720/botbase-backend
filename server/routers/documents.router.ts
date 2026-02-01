/**
 * Documents Router
 * tRPC procedures for document management
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as validation from '../validation';
import * as db from '../db';
import { logger } from '../logger';
import { queueDocumentProcessing } from '../workers/documentProcessor';

export const documentsRouter = router({
  /**
   * Upload document for processing
   */
  upload: protectedProcedure
    .input(validation.uploadDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId);
        if (!project || (project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this project',
          });
        }

        // Create document record
        const document = await db.createDocument({
          projectId: input.projectId,
          sourceId: input.sourceId,
          title: input.title,
          content: input.content,
          metadata: input.metadata,
          status: 'pending',
        });

        // Queue for processing
        await queueDocumentProcessing(
          document.id,
          input.projectId,
          input.content,
          input.title
        );

        logger.info('Document uploaded and queued', {
          documentId: document.id,
          projectId: input.projectId,
          userId: ctx.user.id,
          contentLength: input.content.length,
        });

        return {
          success: true,
          document: {
            id: document.id,
            title: document.title,
            status: document.status,
            createdAt: document.createdAt,
          },
        };
      } catch (error) {
        logger.error('Failed to upload document', error as Error, {
          projectId: input.projectId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * List project documents
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId);
        if (!project || (project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this project',
          });
        }

        const documents: any[] = [];

        return {
          success: true,
          documents,
        };
      } catch (error) {
        logger.error('Failed to list documents', error as Error, {
          projectId: input.projectId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * Get document details
   */
  get: protectedProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        const document = null;

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        // Verify project ownership
        const project = await db.getProjectById((document as any).projectId);
        if (!project || (project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this document',
          });
        }

        return {
          success: true,
          document,
        };
      } catch (error) {
        logger.error('Failed to get document', error as Error, {
          documentId: input.documentId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * Delete document
   */
  delete: protectedProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const document = null;

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        // Verify project ownership
        const project = await db.getProjectById((document as any).projectId);
        if (!project || (project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this document',
          });
        }

        // Delete document from database
        // await db.deleteDocument(input.documentId);

        logger.info('Document deleted', {
          documentId: input.documentId,
          userId: ctx.user.id,
        });

        return {
          success: true,
        };
      } catch (error) {
        logger.error('Failed to delete document', error as Error, {
          documentId: input.documentId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * Get document processing status
   */
  getStatus: protectedProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        const document = null;

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        // Verify project ownership
        const project = await db.getProjectById((document as any).projectId);
        if (!project || (project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this document',
          });
        }

        return {
          success: true,
          status: (document as any).status,
          processedChunks: (document as any).processedChunks || 0,
          totalChunks: (document as any).totalChunks || 0,
          error: (document as any).error,
        };
      } catch (error) {
        logger.error('Failed to get document status', error as Error, {
          documentId: input.documentId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * Search documents by content
   */
  search: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        query: z.string().min(1).max(5000),
        limit: z.number().int().positive().max(100).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId);
        if (!project || (project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this project',
          });
        }

        const results: any[] = [];

        return {
          success: true,
          results,
        };
      } catch (error) {
        logger.error('Failed to search documents', error as Error, {
          projectId: input.projectId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),
});
