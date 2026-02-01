/**
 * Authentication Router
 * tRPC procedures for user registration, login, and token refresh
 */

import { publicProcedure, router } from '../_core/trpc';
import * as auth from '../auth';
import * as validation from '../validation';
import { logger } from '../logger';

export const authRouter = router({
  /**
   * Register new user
   */
  register: publicProcedure
    .input(validation.registerSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await auth.registerUser(input.email, input.password, input.name);
        const userData = result.user as any;
        const ipAddress = (ctx.req as any)?.ip || 'unknown';

        logger.info('User registered', {
          userId: userData.id,
          email: userData.email,
          ipAddress,
        });

        return {
          success: true,
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        };
      } catch (error) {
        logger.error('Registration failed', error as Error, {
          email: input.email,
        });
        throw error;
      }
    }),

  /**
   * Login user
   */
  login: publicProcedure
    .input(validation.loginSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await auth.loginUser(input.email, input.password);
        const userData = result.user as any;
        const ipAddress = (ctx.req as any)?.ip || 'unknown';

        logger.info('User logged in', {
          userId: userData.id,
          email: userData.email,
          ipAddress,
        });

        return {
          success: true,
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        };
      } catch (error) {
        logger.error('Login failed', error as Error, {
          email: input.email,
        });
        throw error;
      }
    }),

  /**
   * Refresh access token
   */
  refresh: publicProcedure
    .input(validation.refreshTokenSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await auth.refreshAccessToken(input.refreshToken);

        return {
          success: true,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        };
      } catch (error) {
        logger.error('Token refresh failed', error as Error);
        throw error;
      }
    }),

  /**
   * Get current user info
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      role: ctx.user.role,
      createdAt: ctx.user.createdAt,
    };
  }),

  /**
   * Logout user
   */
  logout: publicProcedure
    .input(validation.refreshTokenSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await auth.logoutUser(input.refreshToken);

        logger.info('User logged out', {
          userId: ctx.user ? ctx.user.id : undefined,
        });

        return {
          success: true,
        };
      } catch (error) {
        logger.error('Logout failed', error as Error);
        throw error;
      }
    }),
});
