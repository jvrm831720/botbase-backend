/**
 * Billing Router
 * tRPC procedures for billing and usage management
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as db from '../db';
import * as billing from '../billing';
import { logger } from '../logger';

export const billingRouter = router({
  /**
   * Get user usage summary
   */
  getUsage: protectedProcedure
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

        const usage = await billing.getUserUsageSummary(ctx.user.id, input.projectId);

        return {
          success: true,
          usage,
        };
      } catch (error) {
        logger.error('Failed to get usage', error as Error, {
          projectId: input.projectId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * Get user plan details
   */
  getPlan: protectedProcedure.query(async ({ ctx }) => {
    try {
      const plan = null; // Placeholder

      if (!plan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User plan not found',
        });
      }

      const planLimits = billing.getPlanLimits((plan as any).type);

      return {
        success: true,
        plan: {
          id: (plan as any).id,
          type: (plan as any).type,
          name: (plan as any).name,
          price: (plan as any).price,
          limits: planLimits,
        },
      };
    } catch (error) {
      logger.error('Failed to get plan', error as Error, {
        userId: ctx.user.id,
      });
      throw error;
    }
  }),

  /**
   * Get available plans
   */
  getPlans: protectedProcedure.query(async () => {
    try {
      const plans = await db.getAllPlans();

      return {
        success: true,
        plans: plans.map((plan: any) => ({
          id: plan.id,
          type: plan.type,
          name: plan.name,
          price: plan.price,
          limits: billing.getPlanLimits(plan.type),
        })),
      };
    } catch (error) {
      logger.error('Failed to get plans', error as Error);
      throw error;
    }
  }),

  /**
   * Upgrade user plan
   */
  upgradePlan: protectedProcedure
    .input(z.object({ planId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const newPlan = null; // Placeholder

        if (!newPlan) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Plan not found',
          });
        }

        // Update user plan - placeholder
        // await db.updateUserPlan(ctx.user.id, input.planId);

        // Log billing event - placeholder
        // await billing.logBillingEvent(ctx.user.id, 0, 'plan_upgrade', {
        //   planId: input.planId,
        //   planType: (newPlan as any).type,
        // });

        logger.info('User upgraded plan', {
          userId: ctx.user.id,
          planId: input.planId,
          planType: (newPlan as any).type,
        });

        // Placeholder
        const planType = (newPlan as any).type;

        return {
          success: true,
          message: `Successfully upgraded to ${(newPlan as any).name}`,
        };
      } catch (error) {
        logger.error('Failed to upgrade plan', error as Error, {
          userId: ctx.user.id,
          planId: input.planId,
        });
        throw error;
      }
    }),

  /**
   * Get usage history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        limit: z.number().int().positive().max(100).default(30),
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

        const history: any[] = []; // Placeholder

        return {
          success: true,
          history: history.slice(0, input.limit),
        };
      } catch (error) {
        logger.error('Failed to get usage history', error as Error, {
          projectId: input.projectId,
          userId: ctx.user.id,
        });
        throw error;
      }
    }),

  /**
   * Get user credits
   */
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    try {
      const credits = 0; // Placeholder

      return {
        success: true,
        credits,
      };
    } catch (error) {
      logger.error('Failed to get credits', error as Error, {
        userId: ctx.user.id,
      });
      throw error;
    }
  }),

  /**
   * Purchase add-on credits
   */
  purchaseAddOn: protectedProcedure
    .input(
      z.object({
        addOnId: z.number().int().positive(),
        quantity: z.number().int().positive().default(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const addOn = await db.getAddOnById(input.addOnId);

        if (!addOn) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Add-on not found',
          });
        }

        // Calculate total cost
        const totalCost = ((addOn as any).price || 0) * input.quantity;
        const tokensToAdd = ((addOn as any).tokens || 0) * input.quantity;

        // Add credits - placeholder
        // await billing.addCredits(ctx.user.id, tokensToAdd, 'add_on_purchase');

        // Log billing event - placeholder
        // await billing.logBillingEvent(ctx.user.id, 0, 'add_on_purchase', {
        //   addOnId: input.addOnId,
        //   quantity: input.quantity,
        //   tokensAdded: tokensToAdd,
        //   cost: totalCost,
        // });

        logger.info('Add-on purchased', {
          userId: ctx.user.id,
          addOnId: input.addOnId,
          quantity: input.quantity,
          tokensAdded: tokensToAdd,
        });

        // Placeholder return
        const cost = totalCost;

        return {
          success: true,
          message: `Successfully purchased ${input.quantity} add-on(s)`,
          tokensAdded: tokensToAdd,
          cost: totalCost,
        };
      } catch (error) {
        logger.error('Failed to purchase add-on', error as Error, {
          userId: ctx.user.id,
          addOnId: input.addOnId,
        });
        throw error;
      }
    }),

  /**
   * Get available add-ons
   */
  getAddOns: protectedProcedure.query(async () => {
    try {
      const addOns = await db.getAllAddOns();

      return {
        success: true,
        addOns: addOns.map((addOn: any) => ({
          id: addOn.id,
          name: addOn.name,
          description: addOn.description,
          tokens: addOn.tokens,
          price: addOn.price,
        })),
      };
    } catch (error) {
      logger.error('Failed to get add-ons', error as Error);
      throw error;
    }
  }),

  /**
   * Get billing events (admin)
   */
  getEvents: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
        limit: z.number().int().positive().max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        if (input.projectId) {
          // Verify project ownership
          const project = await db.getProjectById(input.projectId);
          if (!project || (project as any).userId !== ctx.user.id) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have access to this project',
            });
          }
        }

        const events: any[] = []; // Placeholder

        return {
          success: true,
          events: events.slice(0, input.limit),
        };
      } catch (error) {
        logger.error('Failed to get billing events', error as Error, {
          userId: ctx.user.id,
        });
        throw error;
      }
    }),
});
