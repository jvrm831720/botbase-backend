# Botbase Backend - Architecture Documentation

## Overview

Botbase is a production-grade AI SaaS platform backend that enables users to build and deploy AI-powered chatbots with Retrieval-Augmented Generation (RAG) capabilities. The system is designed with security, scalability, and maintainability as core principles.

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│                    (Web, Mobile, Embed Widget)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Gateway   │
                    │  (Rate Limiting)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐        ┌─────▼──────┐      ┌──────▼──────┐
   │   Auth   │        │   Projects │      │   Documents │
   │ Services │        │  & Sources │      │   & Embeddings│
   └────┬────┘        └─────┬──────┘      └──────┬──────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  PostgreSQL DB  │
                    │   + pgvector    │
                    └─────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐        ┌─────▼──────┐      ┌──────▼──────┐
   │  Vector  │        │   Billing  │      │   Audit     │
   │  Search  │        │   & Usage  │      │   Logs      │
   └──────────┘        └────────────┘      └─────────────┘
        │
   ┌────▼────────────────────────────────┐
   │  Background Workers (Bull/BullMQ)   │
   │  - Document Processing              │
   │  - Web Crawling                      │
   │  - Embedding Generation              │
   │  - Cleanup Tasks                     │
   └─────────────────────────────────────┘
```

## Core Modules

### 1. Authentication (`server/auth.ts`)

**Responsibilities:**
- User registration and login
- JWT token generation and validation
- Password hashing with bcrypt
- Refresh token management
- Authorization checks

**Security Features:**
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with expiration
- Refresh token rotation
- Secure password validation

**Key Functions:**
- `registerUser()` - Create new user account
- `loginUser()` - Authenticate user
- `generateAccessToken()` - Create JWT
- `verifyAccessToken()` - Validate JWT
- `refreshAccessToken()` - Issue new tokens
- `canAccessProject()` - Check authorization

### 2. Database Layer (`server/db.ts`)

**Responsibilities:**
- PostgreSQL connection management
- Query builders for all entities
- Transaction handling
- Vector search operations

**Key Features:**
- Connection pooling with configurable pool size
- Type-safe queries with Drizzle ORM
- Lazy initialization for local tooling
- Comprehensive error handling

**Supported Entities:**
- Users, Projects, Sources, Documents
- Document Chunks, Embeddings
- Conversations, Messages, Leads
- Usage Tracking, Billing Events
- Jobs, Audit Logs, Refresh Tokens

### 3. RAG Pipeline (`server/rag.ts`)

**Responsibilities:**
- Document chunking with sentence boundary awareness
- Embedding generation via OpenAI API
- Vector similarity search
- Context building for LLM prompts
- Response generation with source attribution

**Key Functions:**
- `chunkDocument()` - Split text into chunks
- `intelligentChunk()` - Preserve sentence boundaries
- `generateEmbedding()` - Create vector embeddings
- `vectorSearch()` - Find relevant documents
- `buildRAGContext()` - Prepare context for LLM
- `generateRAGResponse()` - Generate AI response
- `processDocument()` - Full pipeline execution

**Security:**
- Input sanitization to prevent prompt injection
- Token limit enforcement
- Relevance threshold filtering

### 4. Billing System (`server/billing.ts`)

**Responsibilities:**
- Usage tracking per user/project
- Cost calculation
- Plan limit enforcement
- Billing event logging

**Key Features:**
- Monthly usage reset
- Per-model message tracking (mini/premium)
- Indexed pages tracking
- Add-on credit system
- Hard blocking when limits exceeded

**Plan Types:**
- **Free:** Limited messages and pages
- **Pro:** Higher limits with monthly fee
- **Enterprise:** Unlimited with custom pricing

### 5. Rate Limiting (`server/rateLimit.ts`)

**Responsibilities:**
- Per-IP rate limiting
- Per-user rate limiting for authenticated requests
- Configurable limits and windows

**Features:**
- Automatic window reset
- Remaining quota tracking
- Different limits for authenticated/unauthenticated

### 6. Validation (`server/validation.ts`)

**Responsibilities:**
- Input validation using Zod
- Request/response schema definitions
- Type-safe validation helpers

**Schemas:**
- Authentication (register, login, refresh)
- Projects (create, update)
- Sources (create)
- Documents (upload)
- Conversations (chat)
- Leads (capture)
- Billing (purchase add-ons)

### 7. Logging (`server/logger.ts`)

**Responsibilities:**
- Structured logging with levels
- Audit event logging
- Performance metrics
- Error tracking

**Log Levels:**
- Debug: Development information
- Info: General application events
- Warn: Potentially problematic situations
- Error: Error events

## Database Schema

### Core Tables

**users**
- User accounts with authentication
- Role-based access control
- Email verification tracking

**projects**
- User-owned AI chatbot projects
- Model configuration per project
- Plan association

**sources**
- Data sources (URLs, PDFs, text, DOCX)
- Processing status tracking
- Metadata storage

**documents**
- Extracted content from sources
- Processing status
- Error tracking

**document_chunks**
- Text chunks for embedding
- Chunk indexing
- Token count metadata

**embeddings**
- Vector embeddings with pgvector
- HNSW index for fast similarity search
- Model tracking

**conversations**
- Chat sessions with visitors
- Visitor information (email, phone)
- Status tracking

**messages**
- Individual messages in conversations
- Model used (mini/premium)
- Token usage and source attribution

**leads**
- Captured lead information
- Email, phone, custom metadata
- Conversation association

**usage_tracking**
- Monthly usage per user/project
- Per-model message counts
- Cost calculation

**billing_events**
- All billable events
- Cost tracking
- Metadata for reconciliation

**jobs**
- Background job queue
- Status and retry tracking
- Priority management

**audit_logs**
- All user actions
- Resource changes
- IP and user agent tracking

## Security Architecture

### Authentication & Authorization

1. **Password Security**
   - Bcrypt hashing with 12 rounds
   - Minimum 8 characters
   - No password reuse

2. **Token Security**
   - JWT with HS256 algorithm
   - Short-lived access tokens (24h default)
   - Long-lived refresh tokens (7d default)
   - Automatic token rotation

3. **Authorization**
   - Project-level access control
   - Role-based permissions (admin/user)
   - Resource ownership verification

### Input Validation

1. **Request Validation**
   - Zod schema validation
   - Type checking
   - Length limits
   - Format validation

2. **Prompt Injection Prevention**
   - User input sanitization
   - Code block removal
   - Template syntax removal
   - Length limiting

### Data Protection

1. **Database Security**
   - Connection pooling
   - Parameterized queries
   - SQL injection prevention
   - Audit logging

2. **API Security**
   - CORS configuration
   - Rate limiting
   - Request validation
   - Error message sanitization

## Scalability Considerations

### Database Optimization

1. **Indexing Strategy**
   - Composite indexes on foreign keys
   - Vector index (HNSW) for embeddings
   - Partial indexes for status filtering

2. **Query Optimization**
   - Lazy loading relationships
   - Batch operations for embeddings
   - Connection pooling

### Caching Strategy

1. **Vector Search Caching**
   - Cache similar queries
   - TTL-based invalidation
   - LRU eviction

2. **Plan Limits Caching**
   - Cache plan definitions
   - Invalidate on plan changes

### Horizontal Scaling

1. **Stateless API**
   - No server-side sessions
   - JWT-based authentication
   - Database as single source of truth

2. **Background Workers**
   - Separate worker processes
   - Queue-based job distribution
   - Automatic retry and failure handling

## Error Handling

### Error Categories

1. **Validation Errors** (400)
   - Invalid input format
   - Missing required fields
   - Type mismatches

2. **Authentication Errors** (401)
   - Invalid credentials
   - Expired tokens
   - Missing authentication

3. **Authorization Errors** (403)
   - Insufficient permissions
   - Resource ownership violation

4. **Not Found Errors** (404)
   - Resource doesn't exist
   - Deleted resources

5. **Rate Limit Errors** (429)
   - Exceeded request limit
   - Usage limit exceeded

6. **Server Errors** (500)
   - Unexpected exceptions
   - Database failures
   - External service failures

### Error Recovery

1. **Graceful Degradation**
   - Fallback responses
   - Partial results
   - Service unavailability messages

2. **Retry Logic**
   - Exponential backoff
   - Maximum retry limits
   - Circuit breaker pattern

## Monitoring & Observability

### Logging

- Structured JSON logs
- Request/response logging
- Error tracking with stack traces
- Audit trail for compliance

### Metrics

- Request latency
- Error rates
- Database query performance
- Vector search performance
- Usage tracking

### Health Checks

- Database connectivity
- External service availability
- Queue health
- Disk space monitoring

## Deployment

### Environment Setup

1. **Prerequisites**
   - PostgreSQL 14+ with pgvector
   - Node.js 18+
   - Redis (for queue)

2. **Environment Variables**
   - See `ENV_CONFIG.md` for complete list
   - Secrets management via environment
   - No hardcoded credentials

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --prod
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Production Checklist

- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Configure monitoring/alerting
- [ ] Set up log aggregation
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Set up error tracking (Sentry)
- [ ] Configure CDN for static assets
- [ ] Set up health checks

## Future Enhancements

1. **Real-time Features**
   - WebSocket support for live chat
   - Real-time collaboration

2. **Advanced Analytics**
   - Conversation analytics
   - User behavior tracking
   - ROI calculations

3. **Multi-language Support**
   - Multilingual embeddings
   - Translation capabilities

4. **Advanced RAG**
   - Hybrid search (keyword + semantic)
   - Query expansion
   - Reranking

5. **Integrations**
   - Stripe payment processing
   - Slack notifications
   - Webhook support

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Zod Documentation](https://zod.dev/)
