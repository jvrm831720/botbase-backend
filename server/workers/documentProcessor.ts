/**
 * Document Processing Worker
 * Handles document chunking, embedding generation, and indexing
 */

import { documentProcessingQueue } from './queue';
import { processDocument } from '../rag';
import * as db from '../db';
import { logger, measurePerformance } from '../logger';

// ============================================================================
// DOCUMENT PROCESSING JOB
// ============================================================================

export interface DocumentProcessingJob {
  documentId: number;
  projectId: number;
  content: string;
  title: string;
}

/**
 * Register document processing worker
 */
export function registerDocumentProcessorWorker() {
  documentProcessingQueue.process(2, async (job: any) => {
    const { documentId, projectId, content, title } = job.data as DocumentProcessingJob;

    try {
      logger.info(`Processing document: ${documentId}`, {
        jobId: job.id,
        documentId,
        projectId,
        title,
      });

      // Process document with RAG pipeline
      await measurePerformance(
        `document-processing-${documentId}`,
        async () => {
          await processDocument(documentId, projectId, content);
        },
        { documentId, projectId, contentLength: content.length }
      );

      // Update job progress
      await job.progress(100);

      return {
        success: true,
        documentId,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Document processing failed: ${documentId}`, error as Error, {
        jobId: job.id,
        documentId,
        projectId,
      });

      throw error;
    }
  });

  logger.info('Document processor worker registered');
}

/**
 * Queue document for processing
 */
export async function queueDocumentProcessing(
  documentId: number,
  projectId: number,
  content: string,
  title: string
): Promise<void> {
  try {
    const job = await documentProcessingQueue.add(
      {
        documentId,
        projectId,
        content,
        title,
      } as DocumentProcessingJob,
      {
        priority: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    logger.info(`Document queued for processing: ${documentId}`, {
      jobId: job.id,
      documentId,
    });
  } catch (error) {
    logger.error('Failed to queue document processing', error as Error, {
      documentId,
    });
    throw error;
  }
}

/**
 * Get document processing job status
 */
export async function getDocumentProcessingStatus(jobId: string | number): Promise<{
  status: string;
  progress: number;
  data?: any;
  error?: string;
}> {
  try {
    const job = await documentProcessingQueue.getJob(jobId);

    if (!job) {
      return {
        status: 'not-found',
        progress: 0,
      };
    }

    const state = await job.getState();
    const progress = (job as any).progress || 0;

    return {
      status: state,
      progress,
      data: job.data,
      error: job.failedReason,
    };
  } catch (error) {
    logger.error('Failed to get document processing status', error as Error);
    throw error;
  }
}

/**
 * Queue multiple documents for processing
 */
export async function queueDocumentsInBatch(documents: DocumentProcessingJob[]): Promise<void> {
  try {
    const jobs = documents.map((doc) => ({
      name: 'default',
      data: doc,
      opts: {
        priority: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }));

    await (documentProcessingQueue as any).addBulk(jobs);

    logger.info(`Batch of ${documents.length} documents queued for processing`);
  } catch (error) {
    logger.error('Failed to queue batch of documents', error as Error);
    throw error;
  }
}

/**
 * Get processing statistics
 */
export async function getProcessingStats() {
  try {
    const counts = await documentProcessingQueue.getJobCounts();

    return {
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      waiting: counts.waiting,
    };
  } catch (error) {
    logger.error('Failed to get processing stats', error as Error);
    throw error;
  }
}
