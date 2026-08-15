---
name: "@octs/backend-security"
description: "Secure backend applications against OWASP Top 10 threats"
depends_on: ["@octs/project-awareness"]
tools: ["Helmet", "JWT libraries", "OAuth/OIDC libraries", "CORS"]
---

# @octs/backend-security

## Objective

Secure backend applications against the OWASP Top 10 threats and implement defense-in-depth across authentication, authorization, HTTP headers, rate limiting, CSRF protection, XSS prevention, injection prevention, and secrets management. Every endpoint, every request, and every layer must be built with security as a first-class concern — not bolted on after development.

## Dependencies

- `@octs/project-awareness` — analyze existing project architecture, conventions, and stack before generating any code.

---

## Universal Guardrails

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, services/components exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

---

## OWASP Top 10

### A01:2021 — Broken Access Control

- Enforce authorization at **every endpoint**, not just at the route level.
- Never rely on the client to hide or disable UI elements. Authorization is always server-side.
- Use a centralized authorization middleware or guard that runs before every request handler.
- Log every authorization failure — it may indicate an attack, not just a mistake.

### A02:2021 — Cryptographic Failures

- Use strong, modern algorithms: AES-256-GCM for encryption, SHA-256 or SHA-3 for hashing, bcrypt/scrypt/argon2 for passwords.
- **Never roll your own cryptography.** Use well-audited, maintained libraries.
- Protect data in transit: TLS 1.2 minimum (1.3 preferred), disable weak ciphers.
- Classify data sensitivity. Encrypt PII and secrets at rest and in transit.

### A03:2021 — Injection

- **Always use parameterized queries.** Never concatenate user input into SQL strings.
- For NoSQL databases (MongoDB), use `$eq` operator in queries — never `$where` which evaluates JavaScript.
- Validate and sanitize all file uploads: type whitelist, size limits, content inspection, store outside the web root.
- Treat all user input as untrusted, including data from other internal services.

### A04:2021 — Insecure Design

- Threat model before implementing. Identify assets, attackers, and attack vectors.
- Use secure design patterns: zero-trust, least privilege, defense-in-depth, secure defaults.
- Conduct security reviews as part of the design process, not after implementation.

### A05:2021 — Security Misconfiguration

- Disable unnecessary features, modules, HTTP methods, and headers.
- Use secure defaults: the framework or tool should be secure out of the box.
- Apply the principle of least functionality: only enable what the application needs.
- Automate security configuration in CI/CD to prevent drift.

### A06:2021 — Vulnerable and Outdated Components

- Keep all dependencies updated. Run `npm audit` or `yarn audit` in CI and fail the build on critical vulnerabilities.
- Use tools like Dependabot, Renovate, or Snyk for automated dependency updates.
- Maintain an inventory of all third-party components and their versions.

### A07:2021 — Identification and Authentication Failures

- Enforce MFA for administrative and sensitive operations.
- Use proper session management: secure cookies, session timeouts, session invalidation on logout.
- Do not allow weak passwords. Enforce minimum length (12+ characters) and check against common password lists.
- Protect against credential stuffing: rate-limit login endpoints, use CAPTCHA after repeated failures.

### A08:2021 — Software and Data Integrity Failures

- Verify the integrity of CI/CD artifacts and dependencies (checksums, signatures).
- Use lockfiles (`package-lock.json`, `yarn.lock`) to ensure reproducible builds.
- Never load code or data from untrusted sources at runtime.

### A09:2021 — Security Logging and Monitoring Failures

- Log all authentication events (login, logout, password change, MFA enrollment).
- Log all authorization failures and rate limit violations.
- Ensure logs are tamper-proof and monitored for anomalies.
- Include correlation ID, user ID, IP, user agent, and timestamp in every log entry.

### A10:2021 — Server-Side Request Forgery (SSRF)

- Validate and block requests to internal/private IP ranges from user-supplied URLs.
- Use an allowlist for external resources the application may access.
- Never pass user-supplied URLs directly to HTTP clients without validation.

---

## Authentication

### JWT (JSON Web Tokens)

**Algorithm:** Use RS256 (asymmetric) for distributed systems where multiple services validate tokens. Use HS256 (symmetric) for single-service applications or when simplicity is preferred.

**Token lifetimes:**
- Access token: short-lived, 15 minutes maximum.
- Refresh token: longer-lived, 7-30 days, stored securely.

**Token rotation:**
- Issue a new refresh token on every use. Invalidate the old one.
- This limits the damage window if a refresh token is stolen.

**Storage (critical):**
- **NEVER store tokens in `localStorage` or `sessionStorage`.** They are accessible to JavaScript and vulnerable to XSS.
- Store tokens in **httpOnly, Secure, SameSite cookies**. The `httpOnly` flag prevents JavaScript access. `Secure` ensures HTTPS-only transmission. `SameSite=Strict` prevents CSRF-based token submission.

**Token validation — always validate all claims:**
- `iss` (issuer): must match the expected issuer.
- `aud` (audience): must match this service's identifier.
- `exp` (expiration): must be in the future.
- `nbf` (not before): must be in the past.
- Signature: must be valid using the expected key/secret.
- Never skip any of these checks.

### OAuth 2.0 / OpenID Connect (OIDC)

**Authorization Code + PKCE for ALL clients:**
- PKCE (Proof Key for Code Exchange) is mandatory even for confidential clients. It prevents authorization code interception attacks.
- The implicit flow is deprecated. Never use it.

**Provider selection:** Prefer established, well-audited providers:
- Google Identity, GitHub OAuth, Auth0, Keycloak, AWS Cognito.
- Self-hosted OIDC providers (like Keycloak) for organizations with strict data residency requirements.

**ID token validation:**
- Validate the ID token's signature, `iss`, `aud`, `exp`, `nonce` (if present).
- The ID token contains user identity claims. The access token is for API authorization.

**Session management:**
- Implement proper logout: invalidate the session server-side, not just clear the cookie.
- Support single logout (SLO) if using multiple applications behind the same identity provider.

---

## Authorization

### RBAC (Role-Based Access Control)

- Check **permissions**, not roles, in authorization logic. A role is a collection of permissions. Code should ask "does this user have `write:orders` permission?" not "is this user an `admin`?"
- Roles: `admin`, `manager`, `editor`, `viewer`. Permissions: `create:user`, `read:order`, `delete:product`.
- This decoupling means roles can be redefined without changing authorization code.

### ABAC (Attribute-Based Access Control)

Use attributes (user attributes, resource attributes, environment context) for fine-grained decisions:

```
CAN user WITH role=editor AND department=engineering
   PERFORM action=update
   ON resource OF type=document WITH classification=internal
   IF time IS business-hours
```

- ABAC is more flexible than RBAC for complex authorization scenarios.
- Combine RBAC for coarse-grained access and ABAC for fine-grained policies.

### Policy Engines

- Use **Casbin** or **Oso** for centralized policy management and enforcement.
- Define policies in a declarative language, separate from application code.
- Cache policy decisions to avoid checking the policy engine on every request.

### Permission Checks at Every Layer

- Controller/endpoint level: does this user have permission to access this endpoint?
- Service level: does this user have permission to perform this business operation?
- Data level: does this user have permission to read/modify this specific record?

### Tenant Isolation

In multi-tenant applications, every database query must include a `tenant_id` filter. A user in tenant A must never see data belonging to tenant B:

```sql
-- Every query includes the tenant filter
SELECT * FROM orders WHERE tenant_id = $1 AND id = $2;
```

- Tenancy is a cross-cutting concern. Add it at the data access layer, not sprinkled across every query manually.
- Never trust the client to specify which tenant they belong to.

---

## HTTP Security (Helmet)

### Content Security Policy (CSP)

Restrict which sources can load scripts, styles, fonts, images, and connect:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; connect-src 'self' https://api.example.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
```

- `'unsafe-inline'` for styles is often unavoidable but should be minimized.
- `'unsafe-eval'` for scripts must be avoided — it enables code execution from strings.
- Use nonces or hashes for inline scripts instead of `'unsafe-inline'`.

### HSTS (HTTP Strict Transport Security)

Force HTTPS connections:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

- `max-age` in seconds (63072000 = 2 years).
- `includeSubDomains` applies HSTS to all subdomains.
- `preload` allows submission to browser HSTS preload lists.

### Other Critical Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable browser features by default |

---

## CORS (Cross-Origin Resource Sharing)

### Origin Allowlist

- **Explicitly list allowed origins.** Never use `*` (wildcard) as the origin when credentials are used.
- If multiple origins need access, check the `Origin` request header against an allowlist and echo it back only if it matches.

### Method and Header Restrictions

- Restrict allowed methods to only what your API actually uses: `GET, POST, PUT, PATCH, DELETE`. Never allow `*` for methods.
- Restrict allowed headers to only what clients actually need to send.
- `Access-Control-Allow-Credentials: true` only for authenticated endpoints that use cookie-based auth.

### Configuration Example

```typescript
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24 hours
};
```

---

## Rate Limiting

### Per-IP Rate Limiting (Unauthenticated)

- Apply strict per-IP limits for unauthenticated requests.
- Use this for login endpoints, registration endpoints, password reset endpoints, and public APIs.
- Typical limits: 5-20 requests per minute for authentication endpoints, 60-120 requests per minute for general API.

### Per-User Rate Limiting (Authenticated)

- Rate limit by user ID (or API key) for authenticated requests.
- Provide higher ceilings for authenticated users.
- Use for all API endpoints to prevent abuse even from legitimate accounts.

### Per-Endpoint Specificity

- **Login endpoint:** strictest limits (5 attempts per minute, lock after 10 failures per hour).
- **Password reset:** similar strict limits to login.
- **General CRUD:** moderate limits, higher for reads than writes.
- **File upload:** strict limits due to resource consumption.

### Algorithms

- **Sliding window:** more accurate than fixed window. Tracks requests in a rolling time window.
- **Token bucket:** allows bursts but enforces a sustained rate. Good for APIs that experience natural traffic spikes.
- **Fixed window:** simplest, but susceptible to boundary attacks (all requests at the end of one window and beginning of the next).

### Response

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1617187200
```

Always include `Retry-After` (seconds or HTTP-date) and rate limit headers so clients can self-regulate.

---

## CSRF (Cross-Site Request Forgery)

### SameSite Cookies

- Set `SameSite=Strict` for high-security applications (prevents all cross-site requests).
- Set `SameSite=Lax` for a balance of security and usability (allows GET from cross-site links, blocks POST).
- Never use `SameSite=None` without the `Secure` flag.

### CSRF Tokens

- Generate a unique, unpredictable token per session.
- Include it as a hidden form field or as a custom HTTP header (`X-CSRF-Token`).
- The server validates the token on every state-changing request (POST, PUT, PATCH, DELETE).
- CSRF tokens are not needed if you use `SameSite=Strict` cookies for authentication and CORS with explicit origins, but they provide defense-in-depth.

### Double Submit Cookie

- Send the CSRF token in both a cookie and a request header.
- The server verifies that both values match.
- Simpler than server-side token storage but slightly less secure (attacker needs access to cookie jar).

### Origin/Referer Header Checks

- Validate that the `Origin` or `Referer` header matches the expected origin.
- Both headers can be spoofed by a determined attacker with browser control, but they add another layer for honest clients.

---

## XSS Prevention (Cross-Site Scripting)

### Output Encoding

- Encode all user-generated content before rendering it in HTML, JavaScript, CSS, or URLs.
- Use context-specific encoding: HTML encoding for HTML context, JavaScript encoding for script context, URL encoding for URL parameters.
- Frameworks that auto-encode (React, Vue, Angular) protect against most XSS by default — do not bypass with `dangerouslySetInnerHTML` or `v-html` without extra precautions.

### Content Security Policy

- CSP is the strongest defense against XSS. Even if an attacker injects a script, CSP can prevent it from executing.
- Use CSP in report-only mode first to identify violations, then enforce.

### HttpOnly Cookies

- The `httpOnly` flag prevents JavaScript from reading cookies. If an XSS attack succeeds, the attacker cannot steal the session token from an httpOnly cookie.
- Combined with `Secure` and `SameSite` flags for comprehensive cookie protection.

### Input Validation

- Validate input at the boundary: type, length, format, allowed characters.
- Reject or sanitize input that contains HTML or script-like patterns if the field does not expect rich text.

### DOMPurify for Rich Text

- If users can input HTML (rich text editors, comments), sanitize with DOMPurify server-side before storing or rendering.
- Configure DOMPurify with a strict allowlist of allowed tags and attributes.
- Never render unsanitized user HTML.

---

## Injection Prevention

### SQL Injection

**Always use parameterized queries. Never concatenate user input into SQL:**

```typescript
// BAD — SQL injection vulnerability
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// GOOD — parameterized query
const query = 'SELECT * FROM users WHERE id = ?';
db.execute(query, [userId]);
```

- Parameterized queries ensure user input is treated as data, never as executable code.
- ORMs (Prisma, TypeORM, Sequelize) use parameterized queries by default — do not bypass them with raw queries unless those are also parameterized.

### NoSQL Injection

For MongoDB, use the `$eq` operator to ensure user input is treated as a value, not as an operator:

```javascript
// BAD — user-supplied JSON could contain $ne, $gt, etc.
db.collection('users').find({ username: req.body.username });

// GOOD — force exact match
db.collection('users').find({ username: { $eq: req.body.username } });
```

- Never use `$where` which evaluates JavaScript strings.
- Never pass user input directly to `eval()`, `Function()`, or `setTimeout()`/`setInterval()` with string arguments.

### File Upload Validation

- **Type whitelist:** only allow specific MIME types and extensions. Blacklisting is insufficient.
- **Size limits:** enforce maximum file size at the server and reverse proxy/CDN levels.
- **Content inspection:** verify file magic bytes, not just the extension or MIME type from the client.
- **Storage:** store uploaded files outside the web root. Serve them through a controller that checks authorization.
- **Filename sanitization:** generate server-side filenames (UUIDs). Never use user-supplied filenames on disk.

---

## Secrets Management

### Environment Variables

- All secrets (API keys, database credentials, signing keys) must be read from environment variables — **never hardcoded** in source code.
- The `.env` file must be in `.gitignore`. Never commit it.
- Provide an `.env.example` file that documents every required variable without actual secrets.

### Secret Rotation

- Rotate secrets regularly (every 30-90 days).
- Use short-lived credentials where possible (IAM roles with auto-rotation).
- Have an incident rotation procedure for when a secret is suspected compromised.

### Secret Managers

- For production: use a dedicated secret manager — HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault.
- Secret managers provide: encryption at rest, access audit logs, automatic rotation, fine-grained access control.
- Secrets should never be stored in configuration files, even encrypted configuration files that are committed to the repository.

### Scanning

- Run secret scanning tools (git-secrets, truffleHog, Gitleaks) in CI/CD and as pre-commit hooks.
- Fail the build if any secret pattern is detected in the codebase.

---

## General Best Practices

- Apply the **principle of least privilege** at every level: database users, API keys, service accounts, file system permissions.
- Implement **defense-in-depth**: multiple layers of security so that if one layer fails, others still protect the system.
- Use **secure defaults**: the application should be secure out-of-the-box. Require explicit action to make it less secure.
- Keep security **simple and auditable**. Complex security mechanisms are harder to review and more likely to have flaws.
- Security is not a feature. It is a property of every line of code.
