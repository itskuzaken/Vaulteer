/**
 * In-Memory Stats Cache Service
 * Provides TTL-based caching for stats queries to reduce database load
 * from frequent polling (15s intervals).
 * 
 * Features:
 * - TTL-based expiration (default 10 seconds)
 * - LRU eviction when max entries reached
 * - Pattern-based invalidation
 * - Cache hit/miss logging (debug mode)
 */

const MAX_ENTRIES = 1000;
const DEFAULT_TTL = 10000; // 10 seconds

// Cache storage: Map<key, { value, expiresAt, accessedAt }>
const cache = new Map();

// Stats for monitoring
const stats = {
  hits: 0,
  misses: 0,
  evictions: 0,
};

/**
 * Get a cached value by key
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if expired/missing
 */
function get(key) {
  const entry = cache.get(key);
  
  if (!entry) {
    stats.misses++;
    return null;
  }
  
  // Check expiration
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    stats.misses++;
    return null;
  }
  
  // Update access time for LRU
  entry.accessedAt = Date.now();
  stats.hits++;
  
  if (process.env.STATS_CACHE_DEBUG === 'true') {
    console.log(`[StatsCache] HIT: ${key}`);
  }
  
  return entry.value;
}

/**
 * Set a cached value with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in milliseconds (default 10s)
 */
function set(key, value, ttl = DEFAULT_TTL) {
  // Evict oldest entries if at capacity
  if (cache.size >= MAX_ENTRIES) {
    evictLRU();
  }
  
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
    accessedAt: Date.now(),
  });
  
  if (process.env.STATS_CACHE_DEBUG === 'true') {
    console.log(`[StatsCache] SET: ${key} (TTL: ${ttl}ms)`);
  }
}

/**
 * Invalidate cache entries matching a pattern
 * @param {string} pattern - Substring to match in keys
 */
function invalidate(pattern) {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      count++;
    }
  }
  
  if (process.env.STATS_CACHE_DEBUG === 'true' && count > 0) {
    console.log(`[StatsCache] INVALIDATE: ${count} entries matching "${pattern}"`);
  }
  
  return count;
}

/**
 * Clear all cache entries
 */
function clear() {
  const size = cache.size;
  cache.clear();
  
  if (process.env.STATS_CACHE_DEBUG === 'true') {
    console.log(`[StatsCache] CLEAR: ${size} entries removed`);
  }
}

/**
 * Get cache statistics
 * @returns {object} Cache stats including hit rate
 */
function getStats() {
  const total = stats.hits + stats.misses;
  return {
    ...stats,
    size: cache.size,
    hitRate: total > 0 ? (stats.hits / total * 100).toFixed(1) + '%' : '0%',
  };
}

/**
 * Evict least recently used entries
 * Removes 10% of entries when at capacity
 */
function evictLRU() {
  const entries = Array.from(cache.entries())
    .sort((a, b) => a[1].accessedAt - b[1].accessedAt);
  
  const toEvict = Math.max(1, Math.floor(MAX_ENTRIES * 0.1));
  
  for (let i = 0; i < toEvict && i < entries.length; i++) {
    cache.delete(entries[i][0]);
    stats.evictions++;
  }
  
  if (process.env.STATS_CACHE_DEBUG === 'true') {
    console.log(`[StatsCache] LRU EVICT: ${toEvict} entries`);
  }
}

/**
 * Generate cache key for stats requests
 * @param {string} endpoint - Endpoint name (e.g., 'admin', 'staff')
 * @param {object} params - Query parameters
 * @returns {string} Cache key
 */
function generateKey(endpoint, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `stats:${endpoint}:${sortedParams}`;
}

module.exports = {
  get,
  set,
  invalidate,
  clear,
  getStats,
  generateKey,
  DEFAULT_TTL,
};
