/**
 * Web Crawling Worker
 * Processes URLs and extracts content for RAG pipeline
 */

import { logger } from '../logger';
import * as rag from '../rag';

interface CrawlJob {
  sourceId: number;
  projectId: number;
  url: string;
  depth?: number;
  maxPages?: number;
}

interface CrawlResult {
  sourceId: number;
  projectId: number;
  url: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  status: 'success' | 'error';
  error?: string;
  pagesCrawled: number;
  contentLength: number;
}

/**
 * Crawl URL and extract content
 */
export async function crawlUrl(job: CrawlJob): Promise<CrawlResult> {
  const startTime = Date.now();

  try {
    logger.info('Starting URL crawl', {
      sourceId: job.sourceId,
      projectId: job.projectId,
      url: job.url,
    });

    // Validate URL
    const urlObj = new URL(job.url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol');
    }

    // Check robots.txt
    const canCrawl = await checkRobotsTxt(urlObj.origin);
    if (!canCrawl) {
      throw new Error('URL blocked by robots.txt');
    }

    // Fetch page content
    const content = await fetchPageContent(job.url);

    // Extract metadata
    const metadata = extractMetadata(content);

    // Chunk content
    const chunks = rag.chunkDocument(content, 1000);

    logger.info('URL crawl completed', {
      sourceId: job.sourceId,
      projectId: job.projectId,
      url: job.url,
      duration: Date.now() - startTime,
      contentLength: content.length,
      chunks: chunks.length,
    });

    return {
      sourceId: job.sourceId,
      projectId: job.projectId,
      url: job.url,
      title: metadata.title || 'Untitled',
      content,
      metadata,
      status: 'success',
      pagesCrawled: 1,
      contentLength: content.length,
    };
  } catch (error) {
    logger.error('URL crawl failed', error as Error, {
      sourceId: job.sourceId,
      projectId: job.projectId,
      url: job.url,
    });

    return {
      sourceId: job.sourceId,
      projectId: job.projectId,
      url: job.url,
      title: '',
      content: '',
      metadata: {},
      status: 'error',
      error: (error as Error).message,
      pagesCrawled: 0,
      contentLength: 0,
    };
  }
}

/**
 * Check if URL is allowed by robots.txt
 */
async function checkRobotsTxt(origin: string): Promise<boolean> {
  try {
    const robotsUrl = `${origin}/robots.txt`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(robotsUrl, { signal: controller.signal }).finally(() => clearTimeout(timeout)) as Response;

    if (!response.ok) {
      // If robots.txt doesn't exist, allow crawling
      return true;
    }

    const robotsContent = await response.text();

    // Simple check: if User-agent: * and Disallow: /, block
    if (robotsContent.includes('User-agent: *') && robotsContent.includes('Disallow: /')) {
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('Failed to check robots.txt', { error: (error as Error).message, origin });
    // Allow crawling if robots.txt check fails
    return true;
  }
}

/**
 * Fetch page content
 */
async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = (await fetch(url, {
      headers: {
        'User-Agent': 'Botbase-Crawler/1.0 (+https://botbase.com/crawler)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))) as Response;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error('Invalid content type');
    }

    const html = await response.text();

    // Extract text from HTML
    const text = extractTextFromHtml(html);

    if (!text || text.length < 50) {
      throw new Error('Insufficient content extracted');
    }

    return text;
  } catch (error) {
    throw new Error(`Failed to fetch page: ${(error as Error).message}`);
  }
}

/**
 * Extract text from HTML
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Remove extra whitespace
  text = text
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };

  return text.replace(/&[^;]+;/g, (match) => entities[match] || match);
}

/**
 * Extract metadata from HTML
 */
function extractMetadata(html: string): Record<string, any> {
  const metadata: Record<string, any> = {};

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }

  // Extract meta description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (descMatch) {
    metadata.description = descMatch[1];
  }

  // Extract meta keywords
  const keywordsMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
  if (keywordsMatch) {
    metadata.keywords = keywordsMatch[1].split(',').map((k) => k.trim());
  }

  // Extract language
  const langMatch = html.match(/lang=["']([^"']+)["']/i);
  if (langMatch) {
    metadata.language = langMatch[1];
  }

  return metadata;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Rate limit check for domain
 */
const domainCrawlCounts = new Map<string, { count: number; resetAt: number }>();

export function canCrawlDomain(domain: string, maxPerMinute: number = 10): boolean {
  const now = Date.now();
  const record = domainCrawlCounts.get(domain);

  if (!record || record.resetAt < now) {
    domainCrawlCounts.set(domain, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (record.count < maxPerMinute) {
    record.count++;
    return true;
  }

  return false;
}
