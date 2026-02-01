import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  users,
  projects,
  sources,
  documents,
  documentChunks,
  embeddings,
  conversations,
  messages,
  leads,
  usageTracking,
  billingEvents,
  jobs,
  auditLogs,
  refreshTokens,
  plans,
  addOns,
  type InsertUser,
  type InsertProject,
  type InsertSource,
  type InsertDocument,
  type InsertDocumentChunk,
  type InsertEmbedding,
  type InsertConversation,
  type InsertMessage,
  type InsertLead,
  type InsertUsageTracking,
  type InsertBillingEvent,
  type InsertJob,
  type InsertAuditLog,
  type InsertRefreshToken,
} from '../drizzle/schema';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

/**
 * Initialize database connection
 * Lazily create the drizzle instance so local tooling can run without a DB
 */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, {
        max: parseInt(process.env.DATABASE_POOL_SIZE || '20'),
        idle_timeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn('[Database] Failed to connect:', error);
      _db = null;
      _client = null;
    }
  }
  return _db;
}

/**
 * Close database connection
 */
export async function closeDb() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

// ============================================================================
// USER QUERIES
// ============================================================================

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(users).values(user).returning();
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserByOpenId(openId: string) {
  return getUserByEmail(openId);
}

export async function upsertUser(userData: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const email = userData.email || userData.openId;
  const existing = await getUserByEmail(email);

  if (existing) {
    return updateUser(existing.id, {
      name: userData.name || existing.name,
      email: email,
      lastSignedIn: userData.lastSignedIn || new Date(),
    });
  } else {
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(userData.openId, 12);

    return createUser({
      email: email,
      name: userData.name || 'User',
      passwordHash: passwordHash,
      role: 'user',
      isActive: true,
      emailVerified: true,
      lastSignedIn: userData.lastSignedIn || new Date(),
    });
  }
}

export async function updateUser(id: number, updates: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result[0];
}

// ============================================================================
// PROJECT QUERIES
// ============================================================================

export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(projects).values(project).returning();
  return result[0];
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(projects).where(eq(projects.userId, userId));
}

export async function updateProject(id: number, updates: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .update(projects)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return result[0];
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(projects).where(eq(projects.id, id));
}

// ============================================================================
// SOURCE QUERIES
// ============================================================================

export async function createSource(source: InsertSource) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(sources).values(source).returning();
  return result[0];
}

export async function getSourceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  return result[0];
}

export async function getProjectSources(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(sources).where(eq(sources.projectId, projectId));
}

export async function updateSource(id: number, updates: Partial<InsertSource>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .update(sources)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(sources.id, id))
    .returning();
  return result[0];
}

// ============================================================================
// DOCUMENT QUERIES
// ============================================================================

export async function createDocument(document: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(documents).values(document).returning();
  return result[0];
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0];
}

export async function getSourceDocuments(sourceId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(documents).where(eq(documents.sourceId, sourceId));
}

export async function updateDocument(id: number, updates: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .update(documents)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning();
  return result[0];
}

// ============================================================================
// DOCUMENT CHUNK QUERIES
// ============================================================================

export async function createDocumentChunk(chunk: InsertDocumentChunk) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(documentChunks).values(chunk).returning();
  return result[0];
}

export async function getDocumentChunks(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId))
    .orderBy(asc(documentChunks.chunkIndex));
}

export async function createDocumentChunkBatch(chunks: InsertDocumentChunk[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.insert(documentChunks).values(chunks).returning();
}

// ============================================================================
// EMBEDDING QUERIES
// ============================================================================

export async function createEmbedding(embedding: InsertEmbedding) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(embeddings).values(embedding).returning();
  return result[0];
}

export async function createEmbeddingBatch(embeddingList: InsertEmbedding[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.insert(embeddings).values(embeddingList).returning();
}

/**
 * Vector similarity search using pgvector
 * Note: This requires raw SQL due to pgvector operator limitations
 */
export async function vectorSearch(
  projectId: number,
  vector: number[],
  limit: number = 5,
  threshold: number = 0.7
) {
  const db = await getDb();
  if (!db) return [];

  // Convert vector to PostgreSQL format
  const vectorStr = `[${vector.join(',')}]`;
  const thresholdValue = threshold;
  const limitValue = limit;
  const projectIdValue = projectId;

  // Use raw SQL for vector operations
  return db.execute(sql`
    SELECT 
      e.id,
      e.chunk_id as "chunkId",
      e.document_id as "documentId",
      dc.content,
      d.title,
      d.metadata,
      (1 - (e.vector <=> ${sql.raw(`'${vectorStr}'::vector`)})) as similarity
    FROM embeddings e
    JOIN document_chunks dc ON e.chunk_id = dc.id
    JOIN documents d ON e.document_id = d.id
    WHERE e.project_id = ${projectIdValue}
      AND (1 - (e.vector <=> ${sql.raw(`'${vectorStr}'::vector`)})) > ${thresholdValue}
    ORDER BY similarity DESC
    LIMIT ${limitValue}
  `);
}

// ============================================================================
// CONVERSATION QUERIES
// ============================================================================

export async function createConversation(conversation: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(conversations).values(conversation).returning();
  return result[0];
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result[0];
}

export async function getProjectConversations(projectId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .orderBy(desc(conversations.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateConversation(id: number, updates: Partial<InsertConversation>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .update(conversations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();
  return result[0];
}

// ============================================================================
// MESSAGE QUERIES
// ============================================================================

export async function createMessage(message: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(messages).values(message).returning();
  return result[0];
}

export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

// ============================================================================
// LEAD QUERIES
// ============================================================================

export async function createLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(leads).values(lead).returning();
  return result[0];
}

export async function getProjectLeads(projectId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(leads)
    .where(eq(leads.projectId, projectId))
    .orderBy(desc(leads.createdAt))
    .limit(limit)
    .offset(offset);
}

// ============================================================================
// USAGE TRACKING QUERIES
// ============================================================================

export async function getOrCreateUsageTracking(userId: number, projectId: number, month: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const existing = await db
    .select()
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.projectId, projectId),
        eq(usageTracking.month, month)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db
    .insert(usageTracking)
    .values({
      userId,
      projectId,
      month,
      messagesUsedMini: 0,
      messagesUsedPremium: 0,
      indexedPagesUsed: 0,
      costMini: '0',
      costPremium: '0',
      costIndexedPages: '0',
      totalCost: '0',
    })
    .returning();

  return result[0];
}

export async function updateUsageTracking(id: number, updates: Partial<InsertUsageTracking>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .update(usageTracking)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(usageTracking.id, id))
    .returning();
  return result[0];
}

// ============================================================================
// BILLING EVENT QUERIES
// ============================================================================

export async function createBillingEvent(event: InsertBillingEvent) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(billingEvents).values(event).returning();
  return result[0];
}

export async function getUserBillingEvents(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(billingEvents)
    .where(eq(billingEvents.userId, userId))
    .orderBy(desc(billingEvents.createdAt))
    .limit(limit);
}

// ============================================================================
// JOB QUERIES
// ============================================================================

export async function createJob(job: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(jobs).values(job).returning();
  return result[0];
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0];
}

export async function getPendingJobs(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(jobs)
    .where(eq(jobs.status, 'pending'))
    .orderBy(asc(jobs.priority), asc(jobs.createdAt))
    .limit(limit);
}

export async function updateJob(id: number, updates: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .update(jobs)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(jobs.id, id))
    .returning();
  return result[0];
}

// ============================================================================
// AUDIT LOG QUERIES
// ============================================================================

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(auditLogs).values(log).returning();
  return result[0];
}

export async function getUserAuditLogs(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

// ============================================================================
// REFRESH TOKEN QUERIES
// ============================================================================

export async function createRefreshToken(token: InsertRefreshToken) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(refreshTokens).values(token).returning();
  return result[0];
}

export async function getRefreshToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, token))
    .limit(1);
  return result[0];
}

export async function revokeRefreshToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.token, token));
}

// ============================================================================
// PLAN QUERIES
// ============================================================================

export async function getPlanByType(planType: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(plans)
    .where(eq(plans.type, planType as any))
    .limit(1);
  return result[0];
}

export async function getAllPlans() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(plans);
}

// ============================================================================
// ADD-ON QUERIES
// ============================================================================

export async function getAllAddOns() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(addOns);
}

export async function getAddOnById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(addOns).where(eq(addOns.id, id)).limit(1);
  return result[0];
}
