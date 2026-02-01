/**
 * Job Queue System
 * Manages background jobs for document processing, embeddings, etc.
 */

import Queue from 'bull';
import Redis from 'redis';
import { logger } from '../logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
const redisClient = Redis.createClient({
  url: REDIS_URL,
});

redisClient.on('error', (err) => logger.error('Redis error', err as Error));
redisClient.on('connect', () => logger.info('Redis connected'));

// Define job queues
export const documentProcessingQueue = new Queue('document-processing', REDIS_URL);
export const embeddingQueue = new Queue('embeddings', REDIS_URL);
export const webCrawlQueue = new Queue('web-crawl', REDIS_URL);
export const cleanupQueue = new Queue('cleanup', REDIS_URL);

// ============================================================================
// QUEUE CONFIGURATION
// ============================================================================

/**
 * Configure queue defaults
 */
export function configureQueues() {
  logger.info('Job queues configured');
}

// ============================================================================
// QUEUE EVENTS
// ============================================================================

/**
 * Setup queue event listeners
 */
export function setupQueueListeners() {
  // Document processing queue events
  documentProcessingQueue.on('completed', (job) => {
    logger.info(`Document processing completed: ${job.id}`, {
      jobId: job.id,
      documentId: job.data.documentId,
    });
  });

  documentProcessingQueue.on('failed', (job, err) => {
    logger.error(`Document processing failed: ${job.id}`, err, {
      jobId: job.id,
      documentId: job.data.documentId,
      attempts: job.attemptsMade,
    });
  });

  documentProcessingQueue.on('error', (err) => {
    logger.error('Document processing queue error', err as Error);
  });

  // Embedding queue events
  embeddingQueue.on('completed', (job) => {
    logger.info(`Embedding generation completed: ${job.id}`, {
      jobId: job.id,
      chunkCount: job.data.chunks?.length,
    });
  });

  embeddingQueue.on('failed', (job, err) => {
    logger.error(`Embedding generation failed: ${job.id}`, err, {
      jobId: job.id,
      chunkCount: job.data.chunks?.length,
    });
  });

  // Web crawl queue events
  webCrawlQueue.on('completed', (job) => {
    logger.info(`Web crawl completed: ${job.id}`, {
      jobId: job.id,
      url: job.data.url,
    });
  });

  webCrawlQueue.on('failed', (job, err) => {
    logger.error(`Web crawl failed: ${job.id}`, err, {
      jobId: job.id,
      url: job.data.url,
    });
  });

  logger.info('Queue listeners configured');
}

// ============================================================================
// QUEUE HEALTH
// ============================================================================

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  try {
    const stats = {
      documentProcessing: await documentProcessingQueue.getJobCounts(),
      embeddings: await embeddingQueue.getJobCounts(),
      webCrawl: await webCrawlQueue.getJobCounts(),
      cleanup: await cleanupQueue.getJobCounts(),
    };

    return stats;
  } catch (error) {
    logger.error('Failed to get queue stats', error as Error);
    throw error;
  }
}

/**
 * Clear all queues (use with caution)
 */
export async function clearAllQueues() {
  try {
    await documentProcessingQueue.empty();
    await embeddingQueue.empty();
    await webCrawlQueue.empty();
    await cleanupQueue.empty();

    logger.warn('All queues cleared');
  } catch (error) {
    logger.error('Failed to clear queues', error as Error);
    throw error;
  }
}

/**
 * Shutdown all queues
 */
export async function shutdownQueues() {
  try {
    await documentProcessingQueue.close();
    await embeddingQueue.close();
    await webCrawlQueue.close();
    await cleanupQueue.close();

    logger.info('All queues shut down');
  } catch (error) {
    logger.error('Failed to shutdown queues', error as Error);
  }
}
