---
name: "@octs/caching"
description: "Implement effective caching strategies with Redis and HTTP cache"
depends_on: ["@octs/project-awareness"]
tools: ["Redis", "ioredis", "lru-cache"]
---

# @octs/caching

## Objective

Implement effective caching strategies across the application stack — from Redis-backed application caches to HTTP caching headers and CDN configurations. Every cache must have a clear invalidation strategy, protection against common pitfalls (stampede, penetration, avalanche), and graceful degradation when the cache is unavailable.

## Dependencies

- `@octs/project-awareness` — analyze existing project architecture, conventions, and stack before generating any code.

---

## Universal Guardrails

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, services/components exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

---

## Redis

### Connection Management

**Connection pool:**
- Use a connection pool. Create connections once and reuse them.
- A single Redis connection can handle thousands of requests per second.
- Pool size: typically 5-20 connections per service instance.

**Timeouts:**
- Set connection timeout (e.g., 5 seconds) and command timeout (e.g., 2 seconds).
- If Redis does not respond within the timeout, fail fast and fall back to the data source.
- Never let Redis delays cascade into request timeouts.

**Reconnection:**
- Implement automatic reconnection with exponential backoff.
- On disconnect, mark the Redis client as unhealthy and handle graciously.
- Retry connecting with backoff: 100ms → 200ms → 400ms → 800ms → ... up to a max (e.g., 30 seconds).

### Data Types

| Type | Use Case |
|------|----------|
| **String** | Simple key-value: user sessions, flags, counters, serialized JSON objects |
| **Hash** | Object with fields: user profile, product attributes, configuration |
| **Sorted Set** | Leaderboards, rate limiting windows, priority queues, time-series data |
| **List** | Job queues, recent activity feeds (LPUSH + LTRIM for bounded lists) |
| **Set** | Tags, unique visitors, friends lists, any collection where uniqueness matters |

Choose the right data type for the access pattern. A hash is better than a JSON string for an object you partially update. A sorted set is better than a list for rank-ordered data.

### TTL (Time-To-Live)

- **Every key must have a TTL.** Never store data in Redis without an expiration.
- Without a TTL, Redis memory grows unboundedly until eviction or crash.
- Set TTL based on data freshness requirements: session data (15-30 min), product catalog (5-15 min), configuration (1-5 min), user profile (5-10 min).

```typescript
await redis.set('user:123', JSON.stringify(user), 'EX', 600); // 10 minutes
await redis.expire('user:123', 600); // Set TTL separately
```

### Eviction Policies

When Redis is full, it must evict keys. Choose the right policy:

- `volatile-lru` (recommended): evict least-recently-used keys that have a TTL set. Keys without TTL are protected from eviction.
- `allkeys-lru`: evict least-recently-used keys from all keys, even those without TTL. Use when all keys are expendable.
- `volatile-ttl`: evict keys with the shortest remaining TTL.
- `noeviction`: return an error on writes when full. Use only when data loss is unacceptable.

### Pipelining

Batch multiple Redis commands in a single network round-trip:

```typescript
const pipeline = redis.pipeline();
pipeline.get('user:1');
pipeline.get('user:2');
pipeline.get('user:3');
const results = await pipeline.exec();
// results = [[null, user1], [null, user2], [null, user3]]
```

- Pipelining reduces network overhead for bulk operations.
- Commands in a pipeline are not transactional — they execute independently.
- Use `multi()` (MULTI/EXEC) for atomic transactions instead of `pipeline()`.

### Fallback When Redis Is Down

- The application must continue to function when Redis is unavailable.
- On Redis connection failure: log a warning, mark Redis as unhealthy, and go directly to the data source (database, external API).
- On Redis recovery: log an info event, mark Redis as healthy, and resume caching.
- Never let a cache outage become a full application outage.

---

## Caching Patterns

### Cache Aside (Look-Aside)

The application manages the cache explicitly. The most common and straightforward pattern:

```
1. Application checks cache for key
2. If hit: return cached value
3. If miss: load from database → store in cache → return value
```

```typescript
async function getUser(id: string): Promise<User> {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (user) {
    await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 600);
  }
  return user;
}
```

- Pros: simple, application has full control over what and when to cache.
- Cons: cache logic is in application code. Potential for cache stampede on misses.

### Read-Through

The cache sits between the application and the database. The application always reads from the cache, and the cache handles loading from the database on miss:

```
Application → Cache → (if miss) → Database
```

- Pros: application code is simpler — it only talks to the cache.
- Cons: the cache layer must know how to load data, coupling it to the data source.

### Write-Through

The cache synchronously writes to both the cache and the database:

```
1. Application writes to cache
2. Cache writes to database
3. Both acknowledged before returning to application
```

- Pros: cache is always consistent with the database.
- Cons: writes are slower (double write). Not suitable for write-heavy workloads.

### Write-Behind (Write-Back)

The application writes to the cache, and the cache asynchronously writes to the database:

```
1. Application writes to cache → immediate acknowledgment
2. Cache asynchronously flushes writes to database
```

- Pros: fast writes. Good for write-heavy workloads where eventual consistency is acceptable.
- Cons: data loss risk if Redis crashes before flush. Complex to implement correctly.
- **Only use write-behind when you have explicitly accepted the risk of data loss.**

---

## HTTP Caching

### ETag

The server sends an ETag (entity tag) — a hash or version of the resource. The client sends `If-None-Match` on subsequent requests:

```
Request:
  GET /api/products/123
  If-None-Match: "abc123"

Response (unchanged):
  HTTP/1.1 304 Not Modified
  ETag: "abc123"

Response (changed):
  HTTP/1.1 200 OK
  ETag: "def456"
  { /* updated data */ }
```

- ETags enable conditional requests — the server responds with the full body only when the resource has changed.
- Use a hash of the content or a version number. Database `updated_at` timestamps are a common source.
- 304 responses have no body — they save bandwidth even when a round-trip is necessary.

### Cache-Control

| Directive | Meaning |
|-----------|---------|
| `max-age=<seconds>` | Resource is fresh for this many seconds. Client can use without validating. |
| `s-maxage=<seconds>` | Same as max-age but for shared caches (CDN, proxy). Overrides max-age for shared caches. |
| `private` | Only browser caches may store. Shared caches (CDN) must not store. Use for authenticated data. |
| `public` | Any cache may store. Use for static assets, public API responses. |
| `no-cache` | Cache may store, but must revalidate (with ETag or Last-Modified) before each use. |
| `no-store` | Must not cache at all. Use for sensitive data (bank balances, personal information). |
| `must-revalidate` | After max-age expires, must revalidate before using stale data. |

### Last-Modified

Similar to ETag but uses a timestamp. Simpler, less precise:

```
Request:
  GET /api/products/123
  If-Modified-Since: Wed, 15 Jan 2025 10:30:00 GMT

Response (unchanged):
  HTTP/1.1 304 Not Modified
  Last-Modified: Wed, 15 Jan 2025 10:30:00 GMT
```

- ETag is preferred over Last-Modified because timestamps can be imprecise (sub-second changes, clock skew).
- Use both: Last-Modified as a fallback for clients that don't support ETags.

### Vary Header

Tells caches to vary the cached response based on specific request headers:

```
Vary: Accept-Encoding
Vary: Accept-Language
Vary: Authorization
```

- Without `Vary`, a cache might serve a gzipped response to a client that doesn't accept gzip.
- `Vary: Authorization` prevents serving authenticated data to unauthenticated users through a shared cache.

### CDN Caching

- Set `Cache-Control: public, max-age=3600, s-maxage=86400` to let CDNs cache for longer than browsers.
- Use `Surrogate-Control` or `CDN-Cache-Control` for CDN-specific directives if your CDN supports them.
- Purge CDN cache programmatically on content updates (API-driven invalidation).
- Use cache key customization to exclude irrelevant query parameters from the cache key.

---

## Cache Invalidation

> There are only two hard things in Computer Science: cache invalidation and naming things. — Phil Karlton

### Time-Based (TTL)

- The simplest strategy. Data expires after a fixed time.
- Pro: zero invalidation logic. Con: data may be stale for the TTL duration.
- Acceptable for data where staleness is tolerable: product catalogs, user profiles, configuration.

### Event-Based

Invalidate the cache when the underlying data changes:

```typescript
// After updating a user in the database
await db.updateUser(id, data);
await redis.del(`user:${id}`);          // Invalidate specific key
await redis.del(`user-list:page:*`);    // Invalidate list caches
```

- Pro: data is always fresh. Con: requires discipline — every write path must include invalidation.
- If you forget to invalidate, your cache will serve stale data until the TTL expires.

### Cache Tags

Tag cached items and invalidate by tag:

```typescript
// Store with tags
await redis.set(`page:home`, html, 'EX', 3600);
await redis.sadd(`tag:layout`, `page:home`);

// Invalidate all items with a tag
const keys = await redis.smembers(`tag:layout`);
await redis.del([...keys, `tag:layout`]);
```

- Useful when many keys share a logical group and should be invalidated together.

### Key Patterns

Delete all keys matching a pattern:

```typescript
// Invalidate all user list caches
const keys = await redis.keys('user-list:*');
if (keys.length > 0) await redis.del(keys);
```

- **`KEYS` is a blocking operation.** Never use `KEYS` in production on large datasets. Use `SCAN` for non-blocking iteration:

```typescript
const stream = redis.scanStream({ match: 'user-list:*', count: 100 });
stream.on('data', (keys) => { if (keys.length) redis.del(keys); });
```

### Versioned Keys

Prefix keys with a version number. Increment the version to invalidate all keys at once:

```typescript
// v1 keys
const key = `v1:user:${id}`;

// On schema change, switch to v2 — old keys naturally expire
const key = `v2:user:${id}`;
```

- Pro: atomic invalidation of all keys. Con: old keys remain until TTL expires. Use short TTLs during transitions.

---

## Cache Warming

### Preload on Startup

Load frequently accessed data into the cache when the service starts:

```typescript
async function warmCache() {
  const hotProducts = await db.query(
    'SELECT * FROM products WHERE is_featured = true LIMIT 50',
  );
  for (const product of hotProducts) {
    await redis.set(`product:${product.id}`, JSON.stringify(product), 'EX', 600);
  }
}

// Run after server starts and health checks pass
await warmCache();
```

### Scheduled Warming (Cron)

Periodically refresh cached data:

```typescript
// Every 5 minutes, refresh the top 100 products
cron.schedule('*/5 * * * *', async () => {
  const topProducts = await getTopProducts(100);
  for (const product of topProducts) {
    await redis.set(`product:${product.id}`, JSON.stringify(product), 'EX', 600);
  }
});
```

### Lazy Warming on Cache Miss

When a cache miss occurs for a hot item, batch-load related items:

```typescript
async function getUserFeed(userId: string) {
  const cached = await redis.get(`feed:${userId}`);
  if (cached) return JSON.parse(cached);

  const feed = await db.getFeed(userId);

  // Warm: also load friends' feeds in the background
  background(async () => {
    const friends = await db.getFriendIds(userId);
    for (const friendId of friends) {
      if (!(await redis.exists(`feed:${friendId}`))) {
        const friendFeed = await db.getFeed(friendId);
        await redis.set(`feed:${friendId}`, JSON.stringify(friendFeed), 'EX', 300);
      }
    }
  });

  await redis.set(`feed:${userId}`, JSON.stringify(feed), 'EX', 300);
  return feed;
}
```

### Staggered Loading

When preloading many items, stagger the loads to avoid overwhelming the database:

```typescript
for (const batch of chunk(items, 10)) {
  await Promise.all(batch.map((item) => loadAndCache(item)));
  await sleep(100); // 100ms pause between batches
}
```

---

## Caching Pitfalls

### Cache Stampede

**Symptom:** A hot key expires. Hundreds of concurrent requests all miss the cache simultaneously and hammer the database.

**Solution: Single-flight (request coalescing):**

```typescript
const promises = new Map<string, Promise<any>>();

async function getOrLoad(key: string, loader: () => Promise<any>): Promise<any> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Check if another request is already loading this key
  if (promises.has(key)) return promises.get(key);

  const promise = loader().then(async (data) => {
    await redis.set(key, JSON.stringify(data), 'EX', 600);
    promises.delete(key);
    return data;
  }).catch((err) => {
    promises.delete(key);
    throw err;
  });

  promises.set(key, promise);
  return promise;
}
```

**Alternative: Probabilistic early expiration.** As the TTL nears expiry, have a small percentage of requests preemptively refresh the key, reducing the chance of simultaneous expiration.

### Cache Penetration

**Symptom:** Attackers or bugs request keys that don't exist in the database. Every request misses the cache AND the database, causing unnecessary load.

**Solution: Cache empty results with a short TTL:**

```typescript
async function getUser(id: string): Promise<User | null> {
  const cached = await redis.get(`user:${id}`);
  if (cached) return cached === '__NULL__' ? null : JSON.parse(cached);

  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);

  if (user) {
    await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 600);
  } else {
    await redis.set(`user:${id}`, '__NULL__', 'EX', 60); // Short TTL for nulls
  }
  return user;
}
```

**Alternative: Bloom filter.** Check a bloom filter before querying the database. If the bloom filter says the key doesn't exist, return null without hitting the database.

### Cache Avalanche

**Symptom:** Many keys expire at exactly the same time, causing a massive wave of database requests.

**Solution: Stagger TTLs with random jitter:**

```typescript
// Base TTL is 600 seconds (10 minutes). Add ±20% jitter.
const baseTTL = 600;
const jitter = Math.floor(Math.random() * baseTTL * 0.4) - Math.floor(baseTTL * 0.2);
const ttl = baseTTL + jitter; // 480 to 720 seconds

await redis.set(key, data, 'EX', ttl);
```

### Hot Key Problem

**Symptom:** A single key receives disproportionate traffic (celebrity user, viral content). The cache node holding that key becomes a bottleneck.

**Solutions:**

- **Local in-memory cache:** Store the hot key in application memory (with a very short TTL: 1-5 seconds). Reduces Redis load by orders of magnitude.
- **Key splitting:** Split the hot key into multiple keys with the same value and randomly select one on read:

```typescript
const replicas = 10;
const replicaIndex = Math.floor(Math.random() * replicas);
const value = await redis.get(`hotkey:${replicaIndex}`);
```

- Write all replicas on update. Read from a random replica on access.

---

## General Best Practices

- **Measure before caching.** Don't add caching because "caching is good." Profile, identify the bottleneck, add caching, and measure again. Caching adds complexity — make sure it's worth it.
- **TTL on every key.** Never store data without an expiration. The default expiry saves you from unbounded memory growth.
- **Cache misses must not break the application.** If Redis is down, the application must continue serving requests by going to the database.
- **Invalidation strategy first.** Decide how you will invalidate before you decide what and how to cache. A cache without clear invalidation is a bug waiting to happen.
- **Test with and without cache.** Unit tests should not depend on Redis. Integration tests should verify that cached and uncached code paths produce the same results.
- **Monitor cache hit rate.** If the hit rate drops below 80%, investigate: are TTLs too short? Are keys being evicted? Is data changing too frequently? A low hit rate means the cache adds latency without benefit.
