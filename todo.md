# Botbase Backend - Project TODO

## Core Infrastructure
- [x] Estrutura de pastas e organização do projeto
- [x] Variáveis de ambiente e configuração (.env.example)
- [x] Dependências do projeto (package.json)
- [x] TypeScript configuration e build setup

## Database & Schema
- [x] Schema SQL com pgvector support
- [x] Tabelas: users, projects, sources, documents, embeddings
- [x] Tabelas: conversations, messages, leads, usage_tracking
- [x] Tabelas: plans, add_ons, billing_events
- [x] Índices e constraints apropriados
- [ ] Migrations e scripts de setup

## Authentication & Authorization
- [x] Sistema JWT com refresh tokens
- [x] Hash seguro de senhas (bcrypt)
- [ ] Middleware de autenticação
- [x] Controle de acesso por role (admin, user)
- [x] Isolamento de projetos por usuário
- [ ] Testes de autenticação

## Data Access Layer
- [ ] Modelos TypeScript (User, Project, Document, etc)
- [ ] Query builders com Drizzle ORM
- [ ] Helpers de banco de dados
- [ ] Transações e consistency

## RAG Pipeline
- [x] Integração com OpenAI Embeddings API
- [x] Chunking de documentos com limites de tamanho
- [x] Batch processing de embeddings
- [x] Busca vetorial com pgvector
- [x] Relevance threshold filtering
- [x] Context injection com limite de tokens
- [x] Source attribution nas respostas

## Document Processing
- [ ] Parser de PDF
- [ ] Parser de texto plano
- [ ] Web crawler com robots.txt compliance
- [ ] Extração de metadados
- [ ] Deduplicação de conteúdo
- [ ] Processamento assíncrono com workers

## Workers & Background Jobs
- [ ] Queue system (Bull/BullMQ)
- [ ] Worker para crawling de websites
- [ ] Worker para processamento de PDFs
- [ ] Worker para geração de embeddings
- [ ] Worker para limpeza de dados expirados
- [ ] Retry logic e error handling

## API Routes
- [ ] POST /api/auth/register - Registro de usuário
- [ ] POST /api/auth/login - Login com JWT
- [ ] POST /api/auth/refresh - Refresh token
- [ ] POST /api/projects - Criar projeto
- [ ] GET /api/projects - Listar projetos
- [ ] GET /api/projects/:id - Detalhes do projeto
- [ ] PUT /api/projects/:id - Atualizar projeto
- [ ] DELETE /api/projects/:id - Deletar projeto
- [ ] POST /api/projects/:id/sources - Adicionar fonte
- [ ] POST /api/projects/:id/documents - Upload de documento
- [ ] GET /api/projects/:id/documents - Listar documentos
- [ ] POST /api/projects/:id/chat - Enviar mensagem
- [ ] GET /api/projects/:id/conversations - Histórico
- [ ] POST /api/projects/:id/leads - Capturar lead
- [ ] GET /api/usage - Status de uso
- [ ] POST /api/billing/add-on - Comprar add-on

## Validation & Security
- [x] Schemas Zod para validação de input
- [x] Sanitização de entrada
- [x] Proteção contra SQL injection
- [x] Proteção contra XSS
- [ ] CSRF protection
- [x] Rate limiting por IP e usuário
- [x] Input length limits
- [x] Type checking em todas as rotas

## Rate Limiting & Usage Control
- [x] Rate limiter middleware
- [x] Tracking de uso por modelo (GPT-4.1-mini, GPT-4.1)
- [x] Tracking de mensagens por projeto
- [x] Tracking de páginas indexadas
- [x] Hard block quando limite excedido
- [x] Reset mensal automático
- [x] Consumo de créditos de add-ons

## Billing & Usage Tracking
- [x] Planos com limites (chatbots, mensagens, páginas)
- [x] Add-ons para créditos adicionais
- [x] Rastreamento de consumo por modelo
- [x] Cálculo de custos
- [x] Histórico de transações
- [ ] Hooks para integração com Stripe
- [x] Relatórios de uso

## Logging & Monitoring
- [x] Logger estruturado (Winston/Pino)
- [x] Audit logging para operações críticas
- [x] Error tracking e reporting
- [x] Performance monitoring
- [x] Request/response logging
- [x] Log rotation e cleanup

## Error Handling
- [ ] Custom error classes
- [ ] Global error handler middleware
- [ ] Tratamento de timeouts
- [ ] Graceful degradation
- [ ] User-friendly error messages
- [ ] Error recovery strategies

## Testing
- [ ] Unit tests para auth
- [ ] Unit tests para RAG pipeline
- [ ] Unit tests para billing
- [ ] Integration tests para API
- [ ] Tests de rate limiting
- [ ] Tests de segurança

## Documentation
- [x] README.md com overview
- [x] ARCHITECTURE.md com design decisions
- [ ] API.md com documentação de endpoints
- [x] SETUP.md com instruções de instalação
- [ ] DEPLOYMENT.md com guia de deploy
- [x] SECURITY.md com boas práticas
- [ ] CONTRIBUTING.md para contribuições
- [x] .env.example com variáveis necessárias

## Deployment & DevOps
- [ ] Docker configuration
- [ ] docker-compose para desenvolvimento
- [ ] CI/CD pipeline
- [ ] Health check endpoints
- [ ] Graceful shutdown
- [ ] Environment variable validation

## Performance & Optimization
- [ ] Database query optimization
- [ ] Caching strategy
- [ ] Connection pooling
- [ ] Batch processing optimization
- [ ] Memory management
- [ ] CDN integration para assets

## Security Hardening
- [ ] Secrets management
- [ ] API key rotation
- [ ] SSL/TLS enforcement
- [ ] CORS configuration
- [ ] Helmet middleware
- [ ] Security headers
- [ ] Dependency audit
- [ ] Code review checklist


## Fase 9: Implementação de Rotas API e Workers
- [x] Criar sistema de workers com Bull para processamento assíncrono
- [x] Implementar worker para processamento de documentos
- [x] Criar rotas tRPC para autenticação (register, login, refresh, logout)
- [x] Criar rotas tRPC para projetos (CRUD e usage)
- [ ] Criar rotas tRPC para documentos (upload, list, delete)
- [ ] Criar rotas tRPC para chat (send message, get history)
- [ ] Criar rotas tRPC para billing (get usage, add-on purchase)
- [ ] Implementar web crawling worker
- [ ] Implementar embedding generation worker
- [ ] Implementar cleanup worker

## Fase 10: Testes Unitários
- [x] Testes para autenticação (password, JWT, rate limiting)
- [x] Testes para RAG pipeline (chunking, filtering, context building)
- [x] Testes para billing (usage tracking, limits, cost calculation)
- [ ] Testes para rotas API
- [ ] Testes de integração end-to-end
- [ ] Testes de segurança (SQL injection, XSS, prompt injection)
- [ ] Coverage >80% em módulos críticos

## Fase 11: Documentação Adicional
- [ ] API.md com documentação de endpoints
- [ ] DEPLOYMENT.md com guia de deploy
- [ ] CONTRIBUTING.md para contribuições
- [ ] Exemplos de uso (curl, JavaScript client)
- [ ] Troubleshooting guide
- [ ] Performance tuning guide
