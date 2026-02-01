import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
  foreignKey,
  primaryKey,
  vector,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const sourceTypeEnum = pgEnum('source_type', ['url', 'pdf', 'text', 'docx']);
export const resourceStatusEnum = pgEnum('resource_status', ['pending', 'processing', 'completed', 'failed']);
export const conversationStatusEnum = pgEnum('conversation_status', ['active', 'closed']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);
export const planTypeEnum = pgEnum('plan_type', ['free', 'pro', 'enterprise']);
export const jobTypeEnum = pgEnum('job_type', [
  'crawl_website',
  'process_pdf',
  'process_text',
  'generate_embeddings',
  'cleanup_expired_data',
]);
export const jobStatusEnum = pgEnum('job_status', ['pending', 'processing', 'completed', 'failed']);
export const jobPriorityEnum = pgEnum('job_priority', ['low', 'normal', 'high']);
export const auditActionEnum = pgEnum('audit_action', [
  'auth.login',
  'auth.logout',
  'project.create',
  'project.update',
  'project.delete',
  'document.upload',
  'document.delete',
  'message.send',
  'usage.tracked',
  'billing.charged',
]);

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('user').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    lastSignedIn: timestamp('last_signed_in', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
    isActiveIdx: index('users_is_active_idx').on(table.isActive),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// PLANS & ADD-ONS
// ============================================================================

export const plans = pgTable(
  'plans',
  {
    id: serial('id').primaryKey(),
    type: planTypeEnum('type').notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    monthlyPrice: decimal('monthly_price', { precision: 10, scale: 2 }).notNull(),
    limits: jsonb('limits').notNull(), // { chatbots, messagesPerModelMini, messagesPerModelPremium, indexedPages }
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: uniqueIndex('plans_type_idx').on(table.type),
  })
);

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

export const addOns = pgTable(
  'add_ons',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // messages_mini, messages_premium, indexed_pages
    quantity: integer('quantity').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export type AddOn = typeof addOns.$inferSelect;
export type InsertAddOn = typeof addOns.$inferInsert;

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable(
  'projects',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: integer('plan_id')
      .notNull()
      .references(() => plans.id),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    modelMini: varchar('model_mini', { length: 100 }).default('gpt-4-turbo-preview').notNull(),
    modelPremium: varchar('model_premium', { length: 100 }).default('gpt-4-turbo-preview').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('projects_user_id_idx').on(table.userId),
    isActiveIdx: index('projects_is_active_idx').on(table.isActive),
  })
);

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ============================================================================
// SOURCES
// ============================================================================

export const sources = pgTable(
  'sources',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    type: sourceTypeEnum('type').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    url: varchar('url', { length: 2048 }),
    status: resourceStatusEnum('status').default('pending').notNull(),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata'), // Additional metadata like crawl depth, file size, etc
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('sources_project_id_idx').on(table.projectId),
    statusIdx: index('sources_status_idx').on(table.status),
  })
);

export type Source = typeof sources.$inferSelect;
export type InsertSource = typeof sources.$inferInsert;

// ============================================================================
// DOCUMENTS
// ============================================================================

export const documents = pgTable(
  'documents',
  {
    id: serial('id').primaryKey(),
    sourceId: integer('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata'), // url, author, language, etc
    status: resourceStatusEnum('status').default('pending').notNull(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceIdIdx: index('documents_source_id_idx').on(table.sourceId),
    projectIdIdx: index('documents_project_id_idx').on(table.projectId),
    statusIdx: index('documents_status_idx').on(table.status),
  })
);

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ============================================================================
// DOCUMENT CHUNKS & EMBEDDINGS
// ============================================================================

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: serial('id').primaryKey(),
    documentId: integer('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    metadata: jsonb('metadata'), // chunk position, token count, etc
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    documentIdIdx: index('document_chunks_document_id_idx').on(table.documentId),
    projectIdIdx: index('document_chunks_project_id_idx').on(table.projectId),
  })
);

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = typeof documentChunks.$inferInsert;

export const embeddings = pgTable(
  'embeddings',
  {
    id: serial('id').primaryKey(),
    chunkId: integer('chunk_id')
      .notNull()
      .references(() => documentChunks.id, { onDelete: 'cascade' }),
    documentId: integer('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    vector: vector('vector', { dimensions: 1536 }).notNull(), // OpenAI text-embedding-3-small is 1536 dimensions
    model: varchar('model', { length: 100 }).default('text-embedding-3-small').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    chunkIdIdx: index('embeddings_chunk_id_idx').on(table.chunkId),
    projectIdIdx: index('embeddings_project_id_idx').on(table.projectId),
  })
);

export type Embedding = typeof embeddings.$inferSelect;
export type InsertEmbedding = typeof embeddings.$inferInsert;

// ============================================================================
// CONVERSATIONS & MESSAGES
// ============================================================================

export const conversations = pgTable(
  'conversations',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    visitorId: varchar('visitor_id', { length: 255 }),
    visitorEmail: varchar('visitor_email', { length: 320 }),
    visitorPhone: varchar('visitor_phone', { length: 20 }),
    status: conversationStatusEnum('status').default('active').notNull(),
    metadata: jsonb('metadata'), // browser, location, etc
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('conversations_project_id_idx').on(table.projectId),
    visitorIdIdx: index('conversations_visitor_id_idx').on(table.visitorId),
    statusIdx: index('conversations_status_idx').on(table.status),
  })
);

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    model: varchar('model', { length: 50 }), // 'mini' or 'premium'
    tokensUsed: integer('tokens_used'),
    sourceIds: jsonb('source_ids'), // Array of document IDs used for context
    metadata: jsonb('metadata'), // confidence score, etc
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index('messages_conversation_id_idx').on(table.conversationId),
    projectIdIdx: index('messages_project_id_idx').on(table.projectId),
    roleIdx: index('messages_role_idx').on(table.role),
  })
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ============================================================================
// LEADS
// ============================================================================

export const leads = pgTable(
  'leads',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 320 }),
    phone: varchar('phone', { length: 20 }),
    name: varchar('name', { length: 255 }),
    metadata: jsonb('metadata'), // custom fields, etc
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('leads_project_id_idx').on(table.projectId),
    conversationIdIdx: index('leads_conversation_id_idx').on(table.conversationId),
    emailIdx: index('leads_email_idx').on(table.email),
  })
);

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ============================================================================
// USAGE TRACKING
// ============================================================================

export const usageTracking = pgTable(
  'usage_tracking',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    month: varchar('month', { length: 7 }).notNull(), // YYYY-MM
    messagesUsedMini: integer('messages_used_mini').default(0).notNull(),
    messagesUsedPremium: integer('messages_used_premium').default(0).notNull(),
    indexedPagesUsed: integer('indexed_pages_used').default(0).notNull(),
    costMini: decimal('cost_mini', { precision: 10, scale: 4 }).default('0').notNull(),
    costPremium: decimal('cost_premium', { precision: 10, scale: 4 }).default('0').notNull(),
    costIndexedPages: decimal('cost_indexed_pages', { precision: 10, scale: 4 }).default('0').notNull(),
    totalCost: decimal('total_cost', { precision: 10, scale: 4 }).default('0').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdProjectIdMonthIdx: uniqueIndex('usage_tracking_user_id_project_id_month_idx').on(
      table.userId,
      table.projectId,
      table.month
    ),
    userIdIdx: index('usage_tracking_user_id_idx').on(table.userId),
    projectIdIdx: index('usage_tracking_project_id_idx').on(table.projectId),
  })
);

export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = typeof usageTracking.$inferInsert;

// ============================================================================
// BILLING EVENTS
// ============================================================================

export const billingEvents = pgTable(
  'billing_events',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 50 }).notNull(), // message, indexed_page, add_on_purchase, plan_upgrade
    model: varchar('model', { length: 50 }), // mini or premium
    quantity: integer('quantity').notNull(),
    cost: decimal('cost', { precision: 10, scale: 4 }).notNull(),
    metadata: jsonb('metadata'), // additional details
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('billing_events_user_id_idx').on(table.userId),
    projectIdIdx: index('billing_events_project_id_idx').on(table.projectId),
    typeIdx: index('billing_events_type_idx').on(table.type),
  })
);

export type BillingEvent = typeof billingEvents.$inferSelect;
export type InsertBillingEvent = typeof billingEvents.$inferInsert;

// ============================================================================
// JOBS (Background Workers)
// ============================================================================

export const jobs = pgTable(
  'jobs',
  {
    id: serial('id').primaryKey(),
    type: jobTypeEnum('type').notNull(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sourceId: integer('source_id').references(() => sources.id, { onDelete: 'set null' }),
    documentId: integer('document_id').references(() => documents.id, { onDelete: 'set null' }),
    status: jobStatusEnum('status').default('pending').notNull(),
    priority: jobPriorityEnum('priority').default('normal').notNull(),
    retries: integer('retries').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),
    error: text('error'),
    result: jsonb('result'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    projectIdIdx: index('jobs_project_id_idx').on(table.projectId),
    statusIdx: index('jobs_status_idx').on(table.status),
    priorityIdx: index('jobs_priority_idx').on(table.priority),
    typeIdx: index('jobs_type_idx').on(table.type),
  })
);

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

// ============================================================================
// AUDIT LOGS
// ============================================================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: auditActionEnum('action').notNull(),
    resourceType: varchar('resource_type', { length: 100 }).notNull(),
    resourceId: varchar('resource_id', { length: 255 }).notNull(),
    changes: jsonb('changes'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    resourceTypeResourceIdIdx: index('audit_logs_resource_type_resource_id_idx').on(
      table.resourceType,
      table.resourceId
    ),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// RATE LIMIT TRACKING
// ============================================================================

export const rateLimitTracking = pgTable(
  'rate_limit_tracking',
  {
    id: serial('id').primaryKey(),
    identifier: varchar('identifier', { length: 255 }).notNull(), // IP or user ID
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    requestCount: integer('request_count').default(1).notNull(),
    resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    identifierEndpointIdx: uniqueIndex('rate_limit_tracking_identifier_endpoint_idx').on(
      table.identifier,
      table.endpoint
    ),
  })
);

export type RateLimitTracking = typeof rateLimitTracking.$inferSelect;
export type InsertRateLimitTracking = typeof rateLimitTracking.$inferInsert;

// ============================================================================
// REFRESH TOKENS
// ============================================================================

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 500 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(table.token),
  })
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

// ============================================================================
// RELATIONS (Drizzle ORM Relations)
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  usageTracking: many(usageTracking),
  billingEvents: many(billingEvents),
  auditLogs: many(auditLogs),
  refreshTokens: many(refreshTokens),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [projects.planId],
    references: [plans.id],
  }),
  sources: many(sources),
  documents: many(documents),
  conversations: many(conversations),
  messages: many(messages),
  leads: many(leads),
  usageTracking: many(usageTracking),
  billingEvents: many(billingEvents),
  jobs: many(jobs),
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  project: one(projects, {
    fields: [sources.projectId],
    references: [projects.id],
  }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  source: one(sources, {
    fields: [documents.sourceId],
    references: [sources.id],
  }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  chunks: many(documentChunks),
  embeddings: many(embeddings),
}));

export const documentChunksRelations = relations(documentChunks, ({ one, many }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
  project: one(projects, {
    fields: [documentChunks.projectId],
    references: [projects.id],
  }),
  embeddings: many(embeddings),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  chunk: one(documentChunks, {
    fields: [embeddings.chunkId],
    references: [documentChunks.id],
  }),
  document: one(documents, {
    fields: [embeddings.documentId],
    references: [documents.id],
  }),
  project: one(projects, {
    fields: [embeddings.projectId],
    references: [projects.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  project: one(projects, {
    fields: [conversations.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
  leads: many(leads),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  project: one(projects, {
    fields: [messages.projectId],
    references: [projects.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  project: one(projects, {
    fields: [leads.projectId],
    references: [projects.id],
  }),
  conversation: one(conversations, {
    fields: [leads.conversationId],
    references: [conversations.id],
  }),
}));

export const usageTrackingRelations = relations(usageTracking, ({ one }) => ({
  user: one(users, {
    fields: [usageTracking.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [usageTracking.projectId],
    references: [projects.id],
  }),
}));

export const billingEventsRelations = relations(billingEvents, ({ one }) => ({
  user: one(users, {
    fields: [billingEvents.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [billingEvents.projectId],
    references: [projects.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  project: one(projects, {
    fields: [jobs.projectId],
    references: [projects.id],
  }),
  source: one(sources, {
    fields: [jobs.sourceId],
    references: [sources.id],
  }),
  document: one(documents, {
    fields: [jobs.documentId],
    references: [documents.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));
