# Botbase Backend - Environment Variables Configuration

## Overview

Este documento descreve todas as variáveis de ambiente necessárias para executar o Botbase Backend em diferentes ambientes (desenvolvimento, staging, produção).

## Database

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `DATABASE_URL` | Connection string PostgreSQL com pgvector | `postgresql://user:pass@localhost:5432/botbase` | ✅ Sim |
| `DATABASE_POOL_SIZE` | Tamanho do pool de conexões | `20` | ❌ Não (padrão: 20) |
| `DATABASE_IDLE_TIMEOUT` | Timeout de conexão ociosa (ms) | `30000` | ❌ Não (padrão: 30s) |

## Authentication & Security

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `JWT_SECRET` | Chave secreta para assinar JWTs (mín. 32 caracteres) | `your-super-secret-key-...` | ✅ Sim |
| `JWT_EXPIRY` | Tempo de expiração do JWT | `24h` | ❌ Não (padrão: 24h) |
| `JWT_REFRESH_EXPIRY` | Tempo de expiração do refresh token | `7d` | ❌ Não (padrão: 7d) |
| `BCRYPT_ROUNDS` | Rounds de hash bcrypt | `12` | ❌ Não (padrão: 12) |

## OpenAI API

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `OPENAI_API_KEY` | Chave da API OpenAI | `sk-...` | ✅ Sim |
| `OPENAI_EMBEDDING_MODEL` | Modelo para embeddings | `text-embedding-3-small` | ❌ Não |
| `OPENAI_CHAT_MODEL_MINI` | Modelo chat econômico | `gpt-4-turbo-preview` | ❌ Não |
| `OPENAI_CHAT_MODEL_PREMIUM` | Modelo chat premium | `gpt-4-turbo-preview` | ❌ Não |
| `OPENAI_MAX_TOKENS` | Máximo de tokens por requisição | `2000` | ❌ Não |

## Vector Search

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `VECTOR_SEARCH_SIMILARITY_THRESHOLD` | Threshold mínimo de similaridade | `0.7` | ❌ Não (padrão: 0.7) |
| `VECTOR_SEARCH_TOP_K` | Número de resultados a retornar | `5` | ❌ Não (padrão: 5) |
| `VECTOR_SEARCH_MAX_CONTEXT_TOKENS` | Máximo de tokens de contexto | `2000` | ❌ Não (padrão: 2000) |

## Document Processing

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `CHUNK_SIZE` | Tamanho de cada chunk de documento | `1000` | ❌ Não (padrão: 1000) |
| `CHUNK_OVERLAP` | Sobreposição entre chunks | `200` | ❌ Não (padrão: 200) |
| `MAX_DOCUMENT_SIZE_MB` | Tamanho máximo de documento | `50` | ❌ Não (padrão: 50MB) |
| `MAX_PDF_PAGES` | Máximo de páginas em PDF | `500` | ❌ Não (padrão: 500) |
| `SUPPORTED_FILE_TYPES` | Tipos de arquivo suportados | `pdf,txt,md,docx` | ❌ Não |

## Web Crawling

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `CRAWLER_MAX_DEPTH` | Profundidade máxima de crawling | `3` | ❌ Não (padrão: 3) |
| `CRAWLER_MAX_PAGES` | Máximo de páginas a crawlear | `100` | ❌ Não (padrão: 100) |
| `CRAWLER_TIMEOUT_MS` | Timeout por página (ms) | `30000` | ❌ Não (padrão: 30s) |
| `CRAWLER_USER_AGENT` | User agent do crawler | `Botbase-Crawler/1.0` | ❌ Não |

## Rate Limiting

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `RATE_LIMIT_WINDOW_MS` | Janela de tempo para rate limit (ms) | `60000` | ❌ Não (padrão: 60s) |
| `RATE_LIMIT_MAX_REQUESTS` | Máximo de requisições por janela | `100` | ❌ Não (padrão: 100) |
| `RATE_LIMIT_MAX_REQUESTS_AUTH` | Máximo para usuários autenticados | `1000` | ❌ Não (padrão: 1000) |

## Usage & Billing

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `MONTHLY_RESET_DAY` | Dia do mês para reset de uso | `1` | ❌ Não (padrão: 1º) |
| `FREE_PLAN_CHATBOTS` | Número de chatbots no plano gratuito | `3` | ❌ Não |
| `FREE_PLAN_MESSAGES_MINI` | Mensagens modelo mini por mês | `1000` | ❌ Não |
| `FREE_PLAN_MESSAGES_PREMIUM` | Mensagens modelo premium por mês | `100` | ❌ Não |
| `FREE_PLAN_INDEXED_PAGES` | Páginas indexadas no plano gratuito | `100` | ❌ Não |
| `COST_PER_MESSAGE_MINI` | Custo por mensagem modelo mini | `0.001` | ❌ Não |
| `COST_PER_MESSAGE_PREMIUM` | Custo por mensagem modelo premium | `0.01` | ❌ Não |
| `COST_PER_INDEXED_PAGE` | Custo por página indexada | `0.001` | ❌ Não |

## Stripe (Opcional)

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `STRIPE_SECRET_KEY` | Chave secreta Stripe | `sk_test_...` | ❌ Não |
| `STRIPE_PUBLISHABLE_KEY` | Chave pública Stripe | `pk_test_...` | ❌ Não |
| `STRIPE_WEBHOOK_SECRET` | Secret para webhooks Stripe | `whsec_...` | ❌ Não |

## Storage (S3 Compatible)

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `AWS_REGION` | Região AWS | `us-east-1` | ❌ Não |
| `AWS_ACCESS_KEY_ID` | Access key AWS | `AKIA...` | ❌ Não |
| `AWS_SECRET_ACCESS_KEY` | Secret key AWS | `...` | ❌ Não |
| `AWS_S3_BUCKET` | Nome do bucket S3 | `botbase-documents` | ❌ Não |
| `AWS_S3_ENDPOINT` | Endpoint S3 customizado | `https://s3.amazonaws.com` | ❌ Não |

## Redis

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `REDIS_URL` | Connection string Redis | `redis://localhost:6379` | ❌ Não |
| `REDIS_PASSWORD` | Senha Redis | `...` | ❌ Não |
| `REDIS_DB` | Database Redis | `0` | ❌ Não |

## Email (SMTP)

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `SMTP_HOST` | Host SMTP | `smtp.gmail.com` | ❌ Não |
| `SMTP_PORT` | Porta SMTP | `587` | ❌ Não |
| `SMTP_USER` | Usuário SMTP | `email@gmail.com` | ❌ Não |
| `SMTP_PASSWORD` | Senha SMTP | `...` | ❌ Não |
| `SMTP_FROM` | Email de origem | `noreply@botbase.com` | ❌ Não |

## Logging

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `LOG_LEVEL` | Nível de log | `info` | ❌ Não (padrão: info) |
| `LOG_FORMAT` | Formato de log | `json` | ❌ Não (padrão: json) |
| `LOG_FILE_PATH` | Caminho dos arquivos de log | `./logs` | ❌ Não |
| `LOG_MAX_SIZE` | Tamanho máximo por arquivo | `10m` | ❌ Não |
| `LOG_MAX_FILES` | Número máximo de arquivos | `14` | ❌ Não |

## Application

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `NODE_ENV` | Ambiente Node | `development` | ❌ Não (padrão: development) |
| `PORT` | Porta do servidor | `3000` | ❌ Não (padrão: 3000) |
| `HOST` | Host do servidor | `0.0.0.0` | ❌ Não (padrão: 0.0.0.0) |
| `API_URL` | URL da API | `http://localhost:3000` | ✅ Sim |
| `FRONTEND_URL` | URL do frontend | `http://localhost:3001` | ✅ Sim |

## Monitoring & Observability

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `SENTRY_DSN` | DSN do Sentry para error tracking | `https://...@sentry.io/...` | ❌ Não |
| `DATADOG_API_KEY` | Chave API Datadog | `...` | ❌ Não |
| `DATADOG_SITE` | Site Datadog | `datadoghq.com` | ❌ Não |

## Feature Flags

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|------------|
| `ENABLE_STRIPE_INTEGRATION` | Ativar integração Stripe | `false` | ❌ Não |
| `ENABLE_WEBHOOK_SIGNING` | Ativar assinatura de webhooks | `true` | ❌ Não |
| `ENABLE_AUDIT_LOGGING` | Ativar audit logging | `true` | ❌ Não |
| `ENABLE_RATE_LIMITING` | Ativar rate limiting | `true` | ❌ Não |
| `ENABLE_CACHE` | Ativar cache | `true` | ❌ Não |

## Setup por Ambiente

### Desenvolvimento

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://botbase:botbase@localhost:5432/botbase_dev
JWT_SECRET=dev-secret-key-at-least-32-characters-long
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
```

### Staging

```bash
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/botbase
JWT_SECRET=<use-strong-secret>
OPENAI_API_KEY=sk-...
REDIS_URL=redis://staging-redis.example.com:6379
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true
```

### Produção

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/botbase
JWT_SECRET=<use-very-strong-secret>
OPENAI_API_KEY=sk-...
REDIS_URL=redis://prod-redis.example.com:6379
LOG_LEVEL=warn
ENABLE_AUDIT_LOGGING=true
ENABLE_STRIPE_INTEGRATION=true
SENTRY_DSN=https://...@sentry.io/...
```

## Validação de Variáveis

O servidor valida automaticamente as variáveis de ambiente obrigatórias ao iniciar. Se alguma variável obrigatória estiver faltando, o servidor não iniciará e exibirá um erro claro indicando qual variável está faltando.

## Segurança

- **Nunca** commite o arquivo `.env` no repositório
- Use `.env.local` para desenvolvimento local
- Implemente rotação de secrets em produção
- Use um gerenciador de secrets (AWS Secrets Manager, HashiCorp Vault, etc.)
- Valide e sanitize todas as variáveis de ambiente
- Monitore o acesso a secrets críticos
