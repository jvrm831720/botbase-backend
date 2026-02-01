# Botbase Backend - Setup Guide

## Prerequisites

Before setting up Botbase Backend, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ with pgvector extension ([Install pgvector](https://github.com/pgvector/pgvector))
- **Redis** (optional, for caching and queue)
- **pnpm** package manager ([Install](https://pnpm.io/))

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/botbase-backend.git
cd botbase-backend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup PostgreSQL

#### Create Database

```bash
createdb botbase
```

#### Enable pgvector Extension

```bash
psql botbase -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### Create User (Optional)

```bash
createuser botbase_user
psql -c "ALTER USER botbase_user WITH PASSWORD 'secure_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE botbase TO botbase_user;"
```

### 4. Configure Environment Variables

Copy the environment template and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://botbase_user:secure_password@localhost:5432/botbase
DATABASE_POOL_SIZE=20

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# OpenAI
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
```

### 5. Run Database Migrations

```bash
pnpm db:push
```

This command will:
1. Generate migration files from schema
2. Apply migrations to database
3. Create all tables and indexes

### 6. Start Development Server

```bash
pnpm dev
```

The server will start on `http://localhost:3000`

## Verification

### Check Database Connection

```bash
psql botbase -c "SELECT version();"
```

### Check pgvector Installation

```bash
psql botbase -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### Test API Health

```bash
curl http://localhost:3000/health
```

## Development Workflow

### Running Tests

```bash
pnpm test
```

### Type Checking

```bash
pnpm check
```

### Code Formatting

```bash
pnpm format
```

### Building for Production

```bash
pnpm build
```

## Database Management

### View Database Schema

```bash
psql botbase -c "\dt"
```

### Backup Database

```bash
pg_dump botbase > botbase_backup.sql
```

### Restore Database

```bash
psql botbase < botbase_backup.sql
```

### Reset Database (Development Only)

```bash
dropdb botbase
createdb botbase
psql botbase -c "CREATE EXTENSION IF NOT EXISTS vector;"
pnpm db:push
```

## Troubleshooting

### Connection Refused

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
- Ensure PostgreSQL is running: `brew services start postgresql` (macOS)
- Check connection string in `.env`
- Verify database exists: `psql -l`

### pgvector Not Found

**Problem:** `ERROR: extension "vector" does not exist`

**Solution:**
- Install pgvector: `CREATE EXTENSION vector;`
- Ensure PostgreSQL version is 14+

### JWT Secret Too Short

**Problem:** `Error: JWT_SECRET must be at least 32 characters`

**Solution:**
- Generate secure secret: `openssl rand -base64 32`
- Update `.env` with generated secret

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE :::3000`

**Solution:**
- Change PORT in `.env`
- Or kill process using port: `lsof -ti:3000 | xargs kill -9`

### OpenAI API Key Invalid

**Problem:** `Error: Invalid OpenAI API key`

**Solution:**
- Verify API key from OpenAI dashboard
- Ensure key has correct permissions
- Check for typos in `.env`

## Docker Setup (Optional)

### Build Docker Image

```bash
docker build -t botbase-backend .
```

### Run with Docker Compose

```bash
docker-compose up
```

This will start:
- PostgreSQL database
- Redis cache
- Botbase backend API

## Next Steps

1. **Create Admin User:** See `DEPLOYMENT.md` for admin setup
2. **Configure Stripe:** Optional payment processing integration
3. **Setup Monitoring:** Configure Sentry for error tracking
4. **Deploy:** Follow `DEPLOYMENT.md` for production deployment

## Additional Resources

- [API Documentation](./API.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Security Best Practices](./SECURITY.md)
- [Deployment Guide](./DEPLOYMENT.md)
