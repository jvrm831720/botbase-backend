/**
 * Projects Router
 * tRPC procedures for project management
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as validation from '../validation';
import * as db from '../db';
import { logger } from '../logger';

export const projectsRouter = router({
  /**
   * Create new project
   */
  create: protectedProcedure
    .input(validation.createProjectSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Default to free plan (ID 1)
        const planId = 1;
        const project = await db.createProject({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          modelMini: input.modelMini,
          modelPremium: input.modelPremium,
          planId,
        });

        logger.info('Project created', {
          projectId: project.id,
          userId: ctx.user.id,
          name: project.name,
        });

        return {
          success: true,
          project,
        };
      } catch (error) {
        logger.error('Failed to create project', error as Error, {
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * List user projects
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const projects = await db.getUserProjects(ctx.user.id);

      return {
        success: true,
        projects,
      };
    } catch (error) {
      logger.error('Failed to list projects', error as Error, {
        userId: ctx.user.id,
      });
      throw error;
    }
  }),

  /**
   * Get project details
   */
  get: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        const project = await db.getProjectById(input.projectId);

        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }

        // Verify ownership
        if ((project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this project',
          });
        }

        return {
          success: true,
          project,
        };
      } catch (error) {
        logger.error('Failed to get project', error as Error, {
          projectId: input.projectId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * Update project
   */
  update: protectedProcedure
    .input(
      validation.updateProjectSchema.extend({
        projectId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const project = await db.getProjectById(input.projectId);

        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }

        // Verify ownership
        if ((project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this project',
          });
        }

        const updated = await db.updateProject(input.projectId, {
          name: input.name,
          description: input.description,
          modelMini: input.modelMini,
          modelPremium: input.modelPremium,
        });

        logger.info('Project updated', {
          projectId: input.projectId,
          userId: ctx.user.id,
        });

        return {
          success: true,
          project: updated,
        };
      } catch (error) {
        logger.error('Failed to update project', error as Error, {
          projectId: input.projectId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * Delete project
   */
  delete: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const project = await db.getProjectById(input.projectId);

        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }

        // Verify ownership
        if ((project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this project',
          });
        }

        await db.deleteProject(input.projectId);

        logger.info('Project deleted', {
          projectId: input.projectId,
          userId: ctx.user.id,
        });

        return {
          success: true,
        };
      } catch (error) {
        logger.error('Failed to delete project', error as Error, {
          projectId: input.projectId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * Get project usage statistics
   */
  getUsage: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        const project = await db.getProjectById(input.projectId);

        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }

        // Verify ownership
        if ((project as any).userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this project',
          });
        }

        // Get usage statistics - placeholder for now
        const usage = {
          messagesThisMonth: 0,
          tokensUsed: 0,
          costThisMonth: 0,
        };     return {
          success: true,
          usage,
        };
      } catch (error) {
        logger.error('Failed to get project usage', error as Error, {
          projectId: input.projectId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),
});
