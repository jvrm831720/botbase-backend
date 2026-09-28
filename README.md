# Botbase Backend

> **AI SaaS backend for building chatbots and assistants with Retrieval-Augmented Generation.**

Botbase is a backend foundation for creating AI-powered chat experiences connected to custom knowledge sources.

The project focuses on the infrastructure behind the product:

- authentication;
- projects;
- document ingestion;
- embeddings;
- vector search;
- RAG;
- conversations;
- lead capture;
- usage tracking;
- background processing.

---

## What it solves

A useful AI assistant needs more than a prompt and an API call.

A production-oriented backend needs to handle:

```text
User
  ↓
Authentication
  ↓
Project
  ↓
Knowledge Sources
  ↓
Document Processing
  ↓
Embeddings
  ↓
Vector Search
  ↓
Context Assembly
  ↓
LLM Response
  ↓
Conversation History
```

Botbase explores that full backend path.

---

## Core capabilities

### RAG

- document chunking;
- embedding generation;
- semantic search;
- contextual retrieval;
- response generation with retrieved context.

### Knowledge sources

The architecture is prepared to support multiple source types, including:

- text;
- URLs;
- PDFs;
- DOCX.

### Multi-project model

A user can manage multiple assistant projects with isolated data and conversations.

### Conversations

The backend keeps conversation history and supports lead capture from chat interactions.

### Usage and billing foundation

Usage can be tracked by user and project, enabling product limits and billing rules.

---

## Architecture

```text
Client
  ↓
API
  ├── Authentication
  ├── Projects
  ├── Documents
  ├── Conversations
  └── Usage
        ↓
   PostgreSQL
        ↓
     pgvector
        ↓
 Retrieval Layer
        ↓
      LLM
```

Long-running document work can be moved out of the request lifecycle through background workers.

---

## Security foundation

The backend includes:

- JWT authentication;
- refresh-token flow;
- project-level authorization;
- role-based access control;
- Zod input validation;
- password hashing;
- rate limiting;
- audit logging;
- parameterized database access;
- server-side secret configuration.

Security remains an engineering responsibility, not a checkbox created by writing the word "secure" in a README.

---

## Data and retrieval

PostgreSQL is used as the primary relational store.

`pgvector` provides semantic retrieval for RAG workloads.

The project is structured to keep:

- product data;
- documents;
- embeddings;
- conversations;
- usage;

inside a coherent backend model instead of splitting basic product state across unrelated services.

---

## Project structure

```text
botbase-backend/
├── server/
│   ├── auth.ts
│   ├── db.ts
│   ├── rag.ts
│   ├── billing.ts
│   ├── rateLimit.ts
│   ├── validation.ts
│   ├── logger.ts
│   └── _core/
├── drizzle/
│   ├── schema.ts
│   └── migrations/
├── shared/
│   └── types.ts
├── ARCHITECTURE.md
├── SETUP.md
├── SECURITY.md
├── ENV_CONFIG.md
└── package.json
```

---

## Stack

- Node.js
- TypeScript
- PostgreSQL
- pgvector
- Drizzle ORM
- Zod
- OpenAI
- Vitest
- JWT
- background workers

---

## Quick start

### Requirements

- Node.js 18+
- PostgreSQL 14+
- pgvector
- pnpm

### Install

```bash
git clone https://github.com/jvrm831720/botbase-backend.git
cd botbase-backend

pnpm install
cp .env.example .env
pnpm db:push
pnpm dev
```

The API is served locally on the configured application port.

---

## Main modules

### Authentication

Responsible for:

- registration;
- login;
- access tokens;
- refresh tokens;
- authorization.

### RAG pipeline

Responsible for:

- document processing;
- embeddings;
- vector search;
- context construction;
- model response.

### Usage

Responsible for:

- usage accounting;
- limit checks;
- project/user consumption summaries.

---

## API surface

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Projects

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

### Documents

- `POST /api/projects/:id/sources`
- `POST /api/projects/:id/documents`
- `GET /api/projects/:id/documents`

### Chat

- `POST /api/projects/:id/chat`
- `GET /api/projects/:id/conversations`
- `POST /api/projects/:id/leads`

### Usage

- `GET /api/usage`

---

## Development

```bash
pnpm test
pnpm check
pnpm format
pnpm build
```

---

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SETUP.md](./SETUP.md)
- [SECURITY.md](./SECURITY.md)
- [ENV_CONFIG.md](./ENV_CONFIG.md)

---

## What this project demonstrates

Botbase demonstrates backend work across:

- AI product infrastructure;
- Retrieval-Augmented Generation;
- vector databases;
- authentication and authorization;
- relational data modeling;
- API design;
- usage tracking;
- background processing;
- validation;
- testing.

It is a backend-oriented project rather than a UI showcase.

---

## Author

**João Mendes**  
AI, Automation & Software Technical Partner

I build software, automation, integrations and AI systems for companies, agencies and software teams.

GitHub: [@jvrm831720](https://github.com/jvrm831720)
