# Botbase Backend - Security Guide

## Security Principles

Botbase Backend is built with security as a core principle. This guide outlines the security measures implemented and best practices for deployment.

## Authentication Security

### Password Security

**Implementation:**
- Passwords are hashed using bcrypt with 12 rounds
- Minimum password length: 8 characters
- No password history enforcement (users can reuse old passwords)
- Passwords are never logged or stored in plain text

**Best Practices:**
- Enforce strong password requirements in frontend
- Implement password expiration policies
- Require password change on first login
- Monitor for suspicious login attempts

### JWT Token Security

**Implementation:**
- Access tokens expire after 24 hours (configurable)
- Refresh tokens expire after 7 days (configurable)
- Tokens use HS256 algorithm with secure secret
- Refresh tokens are stored in database and can be revoked
- Token rotation on refresh

**Best Practices:**
- Use HTTPS only to transmit tokens
- Store tokens in secure, httpOnly cookies
- Implement token refresh before expiration
- Revoke tokens on logout
- Monitor for token reuse attacks

### Session Management

**Implementation:**
- Stateless authentication using JWT
- No server-side session storage
- Database-backed refresh token revocation
- Automatic logout on token expiration

**Best Practices:**
- Implement session timeout
- Require re-authentication for sensitive operations
- Track active sessions per user
- Implement concurrent session limits

## Authorization Security

### Project Isolation

**Implementation:**
- Users can only access their own projects
- Role-based access control (admin/user)
- Resource ownership verification
- Project-scoped API keys

**Best Practices:**
- Implement fine-grained permissions
- Use principle of least privilege
- Audit permission changes
- Regular access reviews

### API Key Security

**Implementation:**
- API keys are hashed before storage
- Keys are scoped to specific projects
- Keys can be revoked
- Key rotation recommended

**Best Practices:**
- Rotate keys regularly (monthly)
- Use separate keys for different environments
- Monitor key usage
- Revoke unused keys

## Input Validation

### Request Validation

**Implementation:**
- All inputs validated using Zod schemas
- Type checking enforced
- Length limits applied
- Format validation (email, URL, etc.)

**Validation Rules:**
- Email: RFC 5322 compliant
- Passwords: 8-128 characters
- Names: 2-255 characters
- URLs: Valid URL format
- JSON: Valid JSON structure

### Prompt Injection Prevention

**Implementation:**
- User input sanitization
- Code block removal (`\`\`\`....\`\`\``)
- Template syntax removal (`{{...}}`, `${...}`)
- Input length limiting (5000 chars)
- Special character escaping

**Example Sanitization:**
```typescript
// Removes code blocks and template syntax
const sanitized = userInput
  .replace(/```[\s\S]*?```/g, '')
  .replace(/\{\{[\s\S]*?\}\}/g, '')
  .replace(/\$\{[\s\S]*?\}/g, '')
  .substring(0, 5000);
```

## Database Security

### SQL Injection Prevention

**Implementation:**
- Parameterized queries using Drizzle ORM
- No string concatenation in queries
- Input validation before queries
- Prepared statements

**Example:**
```typescript
// Safe: Uses parameterized query
const user = await db.select()
  .from(users)
  .where(eq(users.email, userEmail));

// Unsafe: Never do this!
// const user = await db.execute(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

### Data Encryption

**Implementation:**
- Passwords hashed with bcrypt
- Sensitive data encrypted at rest (optional)
- TLS/SSL for data in transit
- Database connection encryption

**Best Practices:**
- Enable PostgreSQL SSL connections
- Use encrypted backups
- Encrypt sensitive fields (PII)
- Implement field-level encryption

### Access Control

**Implementation:**
- Database user with limited privileges
- Connection pooling with timeout
- Read-only replicas for analytics
- Audit logging for all modifications

## API Security

### Rate Limiting

**Implementation:**
- Per-IP rate limiting (100 requests/min default)
- Per-user rate limiting (1000 requests/min for authenticated)
- Configurable limits per endpoint
- Automatic reset on time window expiration

**Best Practices:**
- Adjust limits based on usage patterns
- Monitor for abuse
- Implement progressive delays
- Block repeat offenders

### CORS Configuration

**Implementation:**
- Whitelist allowed origins
- Restrict HTTP methods
- Control exposed headers
- Disable credentials if not needed

**Configuration:**
```typescript
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
```

### Error Handling

**Implementation:**
- Generic error messages to users
- Detailed errors only in logs
- No sensitive data in error responses
- Error tracking with request ID

**Example:**
```typescript
// Good: Generic message
throw new Error('Authentication failed');

// Bad: Reveals information
throw new Error('User with email test@example.com not found');
```

## Audit Logging

### Logged Events

**User Actions:**
- Login/logout
- Project creation/deletion
- Document uploads
- Lead captures
- Settings changes

**System Events:**
- Failed authentication attempts
- Rate limit violations
- Permission denials
- API errors

### Audit Log Fields

- User ID
- Action type
- Resource type and ID
- Changes made
- IP address
- User agent
- Timestamp

### Retention

- Keep audit logs for minimum 90 days
- Archive older logs for compliance
- Implement log rotation
- Secure log storage

## Secrets Management

### Environment Variables

**Implementation:**
- All secrets in environment variables
- No hardcoded secrets in code
- Separate secrets per environment
- Secrets never logged

**Required Secrets:**
- `JWT_SECRET` - JWT signing key
- `DATABASE_URL` - Database connection string
- `OPENAI_API_KEY` - OpenAI API key
- `STRIPE_SECRET_KEY` - Stripe API key (if enabled)

### Secret Rotation

**Best Practices:**
- Rotate secrets monthly
- Implement zero-downtime rotation
- Maintain old secrets during transition
- Audit secret access

## Deployment Security

### HTTPS/TLS

**Implementation:**
- Enforce HTTPS in production
- Use valid SSL certificates
- Implement HSTS headers
- Disable SSL v3 and TLS 1.0

### Security Headers

**Implementation:**
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security

### Infrastructure Security

**Best Practices:**
- Use VPC for database
- Implement firewall rules
- Enable database encryption
- Regular security updates
- Intrusion detection
- DDoS protection

## Dependency Security

### Vulnerability Scanning

```bash
# Check for known vulnerabilities
npm audit
pnpm audit
```

### Dependency Updates

**Best Practices:**
- Regular dependency updates
- Test updates in staging
- Monitor security advisories
- Use dependabot or similar tools

### Minimal Dependencies

**Principle:**
- Only use necessary dependencies
- Prefer well-maintained packages
- Avoid abandoned projects
- Review dependency licenses

## Compliance

### GDPR Compliance

**Implementation:**
- Data subject access requests
- Right to deletion
- Data portability
- Consent management

### PCI DSS (if handling payments)

**Implementation:**
- Never store full credit card numbers
- Use Stripe for payment processing
- Implement encryption
- Regular security audits

## Security Checklist

### Development

- [ ] All inputs validated with Zod
- [ ] No hardcoded secrets
- [ ] Passwords hashed with bcrypt
- [ ] JWT tokens properly configured
- [ ] CORS properly configured
- [ ] Error messages generic
- [ ] SQL injection prevented
- [ ] XSS prevention implemented
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented

### Deployment

- [ ] HTTPS/TLS enabled
- [ ] Security headers configured
- [ ] Database encrypted
- [ ] Backups encrypted
- [ ] Audit logging enabled
- [ ] Monitoring configured
- [ ] Secrets in environment variables
- [ ] Database user has limited privileges
- [ ] Firewall rules configured
- [ ] Regular security updates

### Operations

- [ ] Monitor security logs
- [ ] Review audit logs regularly
- [ ] Test disaster recovery
- [ ] Rotate secrets monthly
- [ ] Update dependencies
- [ ] Security training for team
- [ ] Incident response plan
- [ ] Regular security audits

## Incident Response

### Security Incident Process

1. **Detect:** Monitor logs and alerts
2. **Contain:** Isolate affected systems
3. **Investigate:** Determine scope and impact
4. **Remediate:** Fix the vulnerability
5. **Recover:** Restore normal operations
6. **Review:** Post-incident analysis

### Contact Information

- Security Team: security@botbase.com
- Report Vulnerabilities: security@botbase.com
- Incident Response: incidents@botbase.com

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)
