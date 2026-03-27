/**
 * OMNI-CRM Caching Service
 * Multi-layer caching for performance optimization
 */

// ============================================
// TYPES
// ============================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

// ============================================
// IN-MEMORY CACHE (L1)
// ============================================

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 1000;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private hits = 0;
  private misses = 0;

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hits++;
    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this.defaultTTL),
      createdAt: Date.now(),
      hits: 0,
    });
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get or set (compute if missing)
   */
  async getOrSet<T>(
    key: string,
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < oldestTime) {
        oldestTime = entry.hits;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// ============================================
// CACHE KEYS BUILDER
// ============================================

class CacheKeys {
  static user(userId: string): string {
    return `user:${userId}`;
  }

  static userPermissions(userId: string): string {
    return `user:${userId}:permissions`;
  }

  static wallet(walletId: string): string {
    return `wallet:${walletId}`;
  }

  static clientProfile(userId: string): string {
    return `client:${userId}:profile`;
  }

  static ibProfile(ibId: string): string {
    return `ib:${ibId}:profile`;
  }

  static task(taskId: string): string {
    return `task:${taskId}`;
  }

  static tasksList(filters: Record<string, unknown>): string {
    return `tasks:list:${JSON.stringify(filters)}`;
  }

  static dashboardStats(period: string): string {
    return `dashboard:stats:${period}`;
  }

  static exchangeRate(from: string, to: string): string {
    return `exchange:${from}:${to}`;
  }

  static mtAccountBalance(mtAccountId: string): string {
    return `mt:account:${mtAccountId}:balance`;
  }

  static commissionStats(ibId: string, period: string): string {
    return `commission:${ibId}:${period}`;
  }
}

// ============================================
// CACHING DECORATORS
// ============================================

/**
 * Cache decorator for methods
 */
function cached(ttl: number = 5 * 60 * 1000) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cache = new MemoryCache();

    descriptor.value = async function (...args: unknown[]) {
      const key = `${propertyKey}:${JSON.stringify(args)}`;
      return cache.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}

// ============================================
// CACHED DATA ACCESS PATTERNS
// ============================================

class CachedDataAccess {
  private cache = new MemoryCache();

  /**
   * Get user with caching
   */
  async getUser(userId: string): Promise<unknown> {
    return this.cache.getOrSet(
      CacheKeys.user(userId),
      async () => {
        // Would query database
        return null;
      },
      10 * 60 * 1000 // 10 minutes
    );
  }

  /**
   * Invalidate user cache
   */
  invalidateUser(userId: string): void {
    this.cache.delete(CacheKeys.user(userId));
    this.cache.delete(CacheKeys.userPermissions(userId));
    this.cache.delete(CacheKeys.clientProfile(userId));
  }

  /**
   * Get dashboard stats with caching
   */
  async getDashboardStats(period: string): Promise<unknown> {
    return this.cache.getOrSet(
      CacheKeys.dashboardStats(period),
      async () => {
        // Would compute stats
        return null;
      },
      60 * 1000 // 1 minute
    );
  }

  /**
   * Invalidate dashboard cache
   */
  invalidateDashboard(): void {
    // Clear all dashboard caches
    for (const key of ['today', 'week', 'month', 'year']) {
      this.cache.delete(CacheKeys.dashboardStats(key));
    }
  }
}

// ============================================
// CACHE MIDDLEWARE FOR API
// ============================================

/**
 * Create cache middleware
 */
function createCacheMiddleware(ttl: number = 60 * 1000) {
  const cache = new MemoryCache();

  return async function cacheMiddleware(
    req: Request,
    next: () => Promise<Response>
  ): Promise<Response> {
    const url = new URL(req.url);
    
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${url.pathname}${url.search}`;
    const cached = cache.get<Response>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await next();
    
    // Only cache successful responses
    if (response.ok) {
      cache.set(cacheKey, response.clone(), ttl);
    }

    return response;
  };
}

// ============================================
// CACHE SERVICE (Singleton)
// ============================================

class CacheService {
  private static instance: CacheService;
  private cache: MemoryCache;

  private constructor() {
    this.cache = new MemoryCache();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  get<T>(key: string): T | null {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, value, ttl);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  async getOrSet<T>(
    key: string,
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    return this.cache.getOrSet(key, compute, ttl);
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }

  cleanup(): number {
    return this.cache.cleanup();
  }
}

// ============================================
// EXPORTS
// ============================================

export const memoryCache = new MemoryCache();
export const cachedDataAccess = new CachedDataAccess();
export const cacheService = CacheService.getInstance();
export { CacheKeys, CacheService, cached, createCacheMiddleware };
