/**
 * Chat Router
 * tRPC procedures for chat interactions
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import * as validation from '../validation';
import * as db from '../db';
import * as rag from '../rag';
import * as billing from '../billing';
import { logger } from '../logger';

export const chatRouter = router({
  /**
   * Send message to chatbot
   */
  sendMessage: publicProcedure
    .input(validation.chatRequestSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify project exists
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }

        // Check usage limits
        const userId = (project as any).userId;
        const plan = (project as any).plan || 'free';
        const { allowed, reason } = await billing.checkUsageLimits(
          userId,
          input.projectId,
          plan
        );

        if (!allowed) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: reason || 'Usage limit exceeded',
          });
        }

        // Get or create conversation
        let conversation = null;
        if (input.conversationId) {
          conversation = await db.getConversationById(input.conversationId);
          if (!conversation) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Conversation not found',
            });
          }
        } else {
          conversation = await db.createConversation({
            projectId: input.projectId,
            visitorId: input.visitorId,
            visitorEmail: input.visitorEmail,
            visitorPhone: input.visitorPhone,
          });
        }

        // Sanitize user input
        const sanitizedMessage = input.message;

        // Search for relevant documents
        const searchResults = await rag.vectorSearch(
          input.projectId,
          sanitizedMessage
        );

        // Filter by relevance - placeholder
        const relevantChunks = searchResults;

        // Build RAG context
        const context = rag.buildRAGContext(relevantChunks);

        // Generate response
        const response = await rag.generateRAGResponse(
          sanitizedMessage,
          context,
          input.model
        );

        // Create message record
        const message = await db.createMessage({
          projectId: input.projectId,
          conversationId: (conversation as any).id,
          role: 'assistant',
          content: response,
          model: input.model,
          tokensUsed: Math.ceil(response.length / 4),
          sourceIds: relevantChunks.map((chunk: any) => chunk.sourceId),
        });

        // Track usage
        const tokensUsed = Math.ceil(sanitizedMessage.length / 4) + Math.ceil(response.length / 4);
        await billing.trackMessageUsage(
          userId,
          input.projectId,
          input.model,
          tokensUsed
        );

        logger.info('Chat message processed', {
          conversationId: (conversation as any).id,
          projectId: input.projectId,
          model: input.model,
          tokensUsed,
        });

        return {
          success: true,
          message: {
            id: (message as any).id,
            content: response,
            model: input.model,
            createdAt: (message as any).createdAt,
          },
          conversationId: (conversation as any).id,
          tokensUsed,
        };
      } catch (error) {
        logger.error('Failed to process chat message', error as Error, {
          projectId: input.projectId,
        });
        throw error;
      }
    }),

  /**
   * Get conversation history
   */
  getHistory: publicProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ input }) => {
      try {
        const conversation = await db.getConversationById(input.conversationId);

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        const messages: any[] = [];

        return {
          success: true,
          conversation,
          messages,
        };
      } catch (error) {
        logger.error('Failed to get conversation history', error as Error, {
          conversationId: input.conversationId,
        });
        throw error;
      }
    }),

  /**
   * Capture lead information
   */
  captureLead: publicProcedure
    .input(
      z.object({
        conversationId: z.number().int().positive(),
        email: z.string().email(),
        name: z.string().min(1).max(255),
        phone: z.string().max(20).optional(),
        message: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const conversation = await db.getConversationById(input.conversationId);

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        const lead = await db.createLead({
          conversationId: input.conversationId,
          projectId: (conversation as any).projectId,
          email: input.email,
          name: input.name,
          phone: input.phone,
        });

        logger.info('Lead captured', {
          leadId: (lead as any).id,
          conversationId: input.conversationId,
          projectId: (conversation as any).projectId,
        });

        return {
          success: true,
          lead: {
            id: (lead as any).id,
            email: (lead as any).email,
            name: (lead as any).name,
            createdAt: (lead as any).createdAt,
          },
        };
      } catch (error) {
        logger.error('Failed to capture lead', error as Error, {
          conversationId: input.conversationId,
        });
        throw error;
      }
    }),

  /**
   * Get conversation leads (admin only)
   */
  getLeads: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        const project = await db.getProjectById(input.projectId);

        if (!project || (project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this project',
          });
        }

        const leads: any[] = [];

        return {
          success: true,
          leads,
        };
      } catch (error) {
        logger.error('Failed to get leads', error as Error, {
          projectId: input.projectId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * Delete conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const conversation = await db.getConversationById(input.conversationId);

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        const project = await db.getProjectById((conversation as any).projectId);
        if (!project || (project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this conversation',
          });
        }

        // Delete conversation from database
        // await db.deleteConversation(input.conversationId);

        logger.info('Conversation deleted', {
          conversationId: input.conversationId,
          userId: ctx.user.id,
        });

        return {
          success: true,
        };
      } catch (error) {
        logger.error('Failed to delete conversation', error as Error, {
          conversationId: input.conversationId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),
});
