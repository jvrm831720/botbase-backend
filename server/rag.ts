/**
 * RAG (Retrieval-Augmented Generation) Pipeline
 * Handles document chunking, embedding generation, and semantic search
 */

import { invokeLLM } from './_core/llm';
import * as db from './db';
import type { RAGContext } from '@shared/types';

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '1000');
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '200');
const VECTOR_SIMILARITY_THRESHOLD = parseFloat(process.env.VECTOR_SEARCH_SIMILARITY_THRESHOLD || '0.7');
const VECTOR_SEARCH_TOP_K = parseInt(process.env.VECTOR_SEARCH_TOP_K || '5');
const MAX_CONTEXT_TOKENS = parseInt(process.env.VECTOR_SEARCH_MAX_CONTEXT_TOKENS || '2000');
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

// ============================================================================
// DOCUMENT CHUNKING
// ============================================================================

/**
 * Split document into chunks with overlap
 */
export function chunkDocument(
  content: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): string[] {
  if (!content || content.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    const chunk = content.substring(start, end).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start < 0) break;
  }

  return chunks.length > 0 ? chunks : [content];
}

/**
 * Split text by sentences to preserve context
 */
function splitBySentences(content: string): string[] {
  const sentences = content.split(/(?<=[.!?])\s+/);
  return sentences.filter((s) => s.trim().length > 0);
}

/**
 * Intelligent chunking that respects sentence boundaries
 */
export function intelligentChunk(
  content: string,
  targetChunkSize: number = CHUNK_SIZE
): string[] {
  const sentences = splitBySentences(content);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const testChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;

    if (testChunk.length <= targetChunkSize) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    } as any);

    if (response && Array.isArray(response)) {
      return response as number[];
    }

    throw new Error('Invalid embedding response');
  } catch (error) {
    console.error('[RAG] Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple chunks in batch
 */
export async function generateEmbeddingsBatch(chunks: string[]): Promise<number[][]> {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const embeddings: number[][] = [];
  const batchSize = 10;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    try {
      const batchEmbeddings = await Promise.all(
        batch.map((chunk) => generateEmbedding(chunk))
      );
      embeddings.push(...batchEmbeddings);
    } catch (error) {
      console.error('[RAG] Batch embedding failed:', error);
      throw error;
    }
  }

  return embeddings;
}

// ============================================================================
// VECTOR SEARCH
// ============================================================================

/**
 * Search for relevant document chunks using vector similarity
 */
export async function vectorSearch(
  projectId: number,
  query: string,
  limit: number = VECTOR_SEARCH_TOP_K,
  threshold: number = VECTOR_SIMILARITY_THRESHOLD
): Promise<RAGContext['chunks']> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const queryEmbedding = await generateEmbedding(query);
    const results = await db.vectorSearch(projectId, queryEmbedding, limit, threshold);

    return results.map((result: any) => ({
      content: result.content,
      similarity: result.similarity,
      documentId: result.documentId,
      title: result.title,
      url: result.metadata?.url,
    }));
  } catch (error) {
    console.error('[RAG] Vector search failed:', error);
    return [];
  }
}

// ============================================================================
// CONTEXT BUILDING
// ============================================================================

/**
 * Count approximate tokens in text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Build RAG context from search results
 */
export function buildRAGContext(
  chunks: RAGContext['chunks'],
  maxTokens: number = MAX_CONTEXT_TOKENS
): RAGContext {
  let totalTokens = 0;
  const selectedChunks: RAGContext['chunks'] = [];

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk.content);

    if (totalTokens + chunkTokens <= maxTokens) {
      selectedChunks.push(chunk);
      totalTokens += chunkTokens;
    } else {
      break;
    }
  }

  return {
    chunks: selectedChunks,
    totalTokens,
  };
}

/**
 * Format context for LLM prompt
 */
export function formatContextForPrompt(context: RAGContext): string {
  if (context.chunks.length === 0) {
    return '';
  }

  const formattedChunks = context.chunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1}: ${chunk.title}${chunk.url ? ` (${chunk.url})` : ''}]\n${chunk.content}`
    )
    .join('\n\n---\n\n');

  return `Context from knowledge base:\n\n${formattedChunks}`;
}

// ============================================================================
// PROMPT INJECTION PREVENTION
// ============================================================================

/**
 * Sanitize user input to prevent prompt injection
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return '';

  let sanitized = input
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{\{[\s\S]*?\}\}/g, '')
    .replace(/\$\{[\s\S]*?\}/g, '')
    .trim();

  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000);
  }

  return sanitized;
}

// ============================================================================
// DOCUMENT PROCESSING PIPELINE
// ============================================================================

/**
 * Process document: chunk, embed, and store
 */
export async function processDocument(
  documentId: number,
  projectId: number,
  content: string
): Promise<void> {
  try {
    await db.updateDocument(documentId, {
      status: 'processing',
    });

    const chunks = intelligentChunk(content);

    if (chunks.length === 0) {
      throw new Error('No chunks generated from document');
    }

    const createdChunks = await db.createDocumentChunkBatch(
      chunks.map((chunk, index) => ({
        documentId,
        projectId,
        content: chunk,
        chunkIndex: index,
        metadata: {
          tokenCount: estimateTokens(chunk),
        },
      }))
    );

    const embeddings = await generateEmbeddingsBatch(chunks);

    if (embeddings.length !== createdChunks.length) {
      throw new Error('Embedding count mismatch with chunk count');
    }

    await db.createEmbeddingBatch(
      embeddings.map((embedding, index) => ({
        chunkId: createdChunks[index].id,
        documentId,
        projectId,
        vector: embedding,
        model: EMBEDDING_MODEL,
      }))
    );

    await db.updateDocument(documentId, {
      status: 'completed',
    });

    console.log(`[RAG] Document ${documentId} processed successfully with ${chunks.length} chunks`);
  } catch (error) {
    console.error('[RAG] Document processing failed:', error);

    await db.updateDocument(documentId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

// ============================================================================
// RESPONSE GENERATION
// ============================================================================

/**
 * Generate response using RAG context
 */
export async function generateRAGResponse(
  query: string,
  context: RAGContext,
  model: 'mini' | 'premium' = 'mini'
): Promise<string> {
  const systemPrompt = `You are a helpful assistant. Use the provided context to answer questions accurately.
If the context doesn't contain relevant information, say so clearly.
Always cite your sources when using information from the context.`;

  const contextStr = formatContextForPrompt(context);
  const userMessage = `${contextStr}\n\nUser question: ${sanitizeUserInput(query)}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    } as any);

    const content = response?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : 'Unable to generate response';
  } catch (error) {
    console.error('[RAG] Response generation failed:', error);
    throw error;
  }
}
