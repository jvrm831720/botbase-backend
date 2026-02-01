/**
 * RAG Pipeline Tests
 * Unit tests for RAG module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as rag from './rag';

describe('RAG Pipeline', () => {
  describe('Document Chunking', () => {
    it('should chunk text into smaller pieces', () => {
      const text = 'This is a test document. '.repeat(100);
      const chunks = rag.chunkDocument(text, 500);

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(500);
      });
    });

    it('should preserve content when chunking', () => {
      const text = 'This is a test document with important information.';
      const chunks = rag.chunkDocument(text, 100);
      const joined = chunks.join(' ');

      expect(joined).toContain('important');
      expect(joined).toContain('information');
    });

    it('should handle empty documents', () => {
      const chunks = rag.chunkDocument('', 500);

      expect(chunks).toEqual([]);
    });

    it('should handle very small chunk size', () => {
      const text = 'This is a test.';
      const chunks = rag.chunkDocument(text, 5);

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(5);
      });
    });

    it('should respect chunk boundaries', () => {
      const text = 'Sentence one. Sentence two. Sentence three.';
      const chunks = rag.chunkDocument(text, 20);

      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('Relevance Filtering', () => {
    it('should filter low relevance results', () => {
      const results = [
        { content: 'Highly relevant content', score: 0.95 },
        { content: 'Somewhat relevant', score: 0.65 },
        { content: 'Not relevant at all', score: 0.15 },
      ];

      const filtered = rag.filterByRelevance(results, 0.7);

      expect(filtered.length).toBe(1);
      expect(filtered[0].score).toBeGreaterThanOrEqual(0.7);
    });

    it('should handle empty results', () => {
      const filtered = rag.filterByRelevance([], 0.7);

      expect(filtered).toEqual([]);
    });

    it('should handle threshold of 0', () => {
      const results = [
        { content: 'Content', score: 0.1 },
        { content: 'More content', score: 0.05 },
      ];

      const filtered = rag.filterByRelevance(results, 0);

      expect(filtered.length).toBe(2);
    });

    it('should handle threshold of 1', () => {
      const results = [
        { content: 'Content', score: 0.99 },
        { content: 'More content', score: 1.0 },
      ];

      const filtered = rag.filterByRelevance(results, 1.0);

      expect(filtered.length).toBe(1);
      expect(filtered[0].score).toBe(1.0);
    });
  });

  describe('Context Building', () => {
    it('should build RAG context from chunks', () => {
      const chunks = [
        { content: 'First chunk', source: 'doc1.pdf' },
        { content: 'Second chunk', source: 'doc2.txt' },
      ];

      const context = rag.buildRAGContext(chunks);

      expect(context).toContain('First chunk');
      expect(context).toContain('Second chunk');
      expect(context).toContain('doc1.pdf');
      expect(context).toContain('doc2.txt');
    });

    it('should respect token limits', () => {
      const chunks = [
        { content: 'A'.repeat(1000), source: 'doc1.pdf' },
        { content: 'B'.repeat(1000), source: 'doc2.txt' },
      ];

      const context = rag.buildRAGContext(chunks, 1500);

      // Should be less than token limit
      expect(context.length).toBeLessThan(2000);
    });

    it('should handle empty chunks', () => {
      const context = rag.buildRAGContext([]);

      expect(context).toBeDefined();
      expect(typeof context).toBe('string');
    });

    it('should include source attribution', () => {
      const chunks = [
        { content: 'Important information', source: 'source.pdf' },
      ];

      const context = rag.buildRAGContext(chunks);

      expect(context).toContain('source.pdf');
    });
  });

  describe('Query Processing', () => {
    it('should sanitize query input', () => {
      const query = 'What is ```code```? And ${variable}?';
      const sanitized = rag.sanitizeQuery(query);

      expect(sanitized).not.toContain('```');
      expect(sanitized).not.toContain('${');
    });

    it('should limit query length', () => {
      const longQuery = 'a'.repeat(10000);
      const sanitized = rag.sanitizeQuery(longQuery);

      expect(sanitized.length).toBeLessThanOrEqual(5000);
    });

    it('should preserve normal queries', () => {
      const query = 'What is the meaning of life?';
      const sanitized = rag.sanitizeQuery(query);

      expect(sanitized).toBe(query);
    });
  });

  describe('Embedding Batch Processing', () => {
    it('should batch chunks for embedding', () => {
      const chunks = Array.from({ length: 250 }, (_, i) => `Chunk ${i}`);
      const batches = rag.batchChunksForEmbedding(chunks, 100);

      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(100);
      expect(batches[1].length).toBe(100);
      expect(batches[2].length).toBe(50);
    });

    it('should handle empty chunks', () => {
      const batches = rag.batchChunksForEmbedding([], 100);

      expect(batches).toEqual([]);
    });

    it('should handle single batch', () => {
      const chunks = Array.from({ length: 50 }, (_, i) => `Chunk ${i}`);
      const batches = rag.batchChunksForEmbedding(chunks, 100);

      expect(batches.length).toBe(1);
      expect(batches[0].length).toBe(50);
    });

    it('should respect batch size', () => {
      const chunks = Array.from({ length: 500 }, (_, i) => `Chunk ${i}`);
      const batchSize = 50;
      const batches = rag.batchChunksForEmbedding(chunks, batchSize);

      batches.forEach((batch) => {
        expect(batch.length).toBeLessThanOrEqual(batchSize);
      });
    });
  });

  describe('Response Generation', () => {
    it('should generate response with context', async () => {
      const query = 'What is AI?';
      const context = 'AI is artificial intelligence...';
      const model = 'mini';

      // Mock the LLM call
      const response = await rag.generateRAGResponse(query, context, model);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should handle empty context', async () => {
      const query = 'What is AI?';
      const context = '';
      const model = 'mini';

      const response = await rag.generateRAGResponse(query, context, model);

      expect(response).toBeDefined();
    });

    it('should support different models', async () => {
      const query = 'Test query';
      const context = 'Test context';

      const miniResponse = await rag.generateRAGResponse(query, context, 'mini');
      const premiumResponse = await rag.generateRAGResponse(query, context, 'premium');

      expect(miniResponse).toBeDefined();
      expect(premiumResponse).toBeDefined();
    });
  });
});
