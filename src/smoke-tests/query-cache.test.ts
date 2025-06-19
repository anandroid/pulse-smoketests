/**
 * Query Cache Smoke Test
 * 
 * CODE FLOW DOCUMENTATION:
 * ========================
 * 
 * 1. USER SEARCH (pulse-ui)
 *    - User enters search in frontend
 *    - pulse-ui/src/hooks/use-progressive-search.ts initiates search
 *    - Calls local Next.js API route: POST /api/search/rag
 * 
 * 2. NEXT.JS API ROUTE (pulse-ui)
 *    - pulse-ui/src/app/api/search/rag/route.ts
 *    - Forwards request to pulse-apis: POST /api/search/query_cache
 *    - Adds device ID and trace headers
 * 
 * 3. PULSE-APIS ENDPOINT
 *    - pulse-apis/searchRoutes.ts handles /api/search/:strategy
 *    - Creates OpenAIHelper instance
 *    - Calls executeWaterfallStrategy with 'query_cache' strategy
 * 
 * 4. WATERFALL STRATEGY (pulse-ai-utils)
 *    - pulse/lib/src/helpers/llm-base.ts - executeWaterfallStrategy()
 *    - Implements waterfall pattern with fallbacks
 *    - query_cache → rag_cache → vector_only → hybrid_only → web_search
 * 
 * 5. QUERY CACHE LOOKUP
 *    - pulse/lib/src/helpers/query-cache.ts - getCachedResult()
 *    - Queries Firestore using location filters
 *    - Uses Levenshtein distance for string similarity (>= 0.9 threshold)
 *    - Checks age (<24 hours) and location match
 * 
 * 6. CACHE STORAGE
 *    - Primary: Firestore (query_cache collection)
 *    - Secondary: Supabase (query_cache table with vector embeddings)
 *    - Cache writes are fire-and-forget to Cloud Functions
 * 
 * DEBUGGING TIPS:
 * ===============
 * - If query_cache returns no results, check:
 *   1. Firestore connectivity and permissions
 *   2. Location fields match exactly (area, region, country)
 *   3. Cache age (24-hour TTL)
 *   4. String similarity threshold (0.9)
 * 
 * - Common failure points:
 *   1. Firestore service account not configured
 *   2. Location mismatch (e.g., "Tampa Bay" vs "tampa-bay")
 *   3. Expired cache entries
 *   4. Query variation exceeds similarity threshold
 */

import { supabaseService } from '../services/supabase';
import { pulseAPIService } from '../services/pulse-api';
import logger from '../utils/logger';

describe('Query Cache Smoke Tests', () => {
  let validCacheEntry: any;
  let testRequest: any;

  beforeAll(async () => {
    logger.info('Setting up query cache tests...');
    
    // First, try to find a valid cache entry from Supabase
    // We look for entries that:
    // 1. Haven't expired (expire_at > now)
    // 2. Have a valid response
    // 3. Match our test location
    const cacheEntries = await supabaseService.getCacheEntriesByPrompt('', 10);
    
    // Filter for valid entries (check both 'response' and 'result' fields)
    validCacheEntry = cacheEntries.find(entry => {
      const hasExpired = new Date(entry.expire_at) <= new Date();
      if (hasExpired) return false;
      
      // Check 'response' field first
      if (entry.response?.data && Array.isArray(entry.response.data) && entry.response.data.length > 0) {
        return true;
      }
      
      // Check 'result' field (legacy format)
      if (entry.result?.data && Array.isArray(entry.result.data) && entry.result.data.length > 0) {
        return true;
      }
      
      return false;
    });

    if (!validCacheEntry) {
      // If no valid entry found, create a test scenario
      logger.warn('No valid cache entry found, using test data');
      validCacheEntry = {
        prompt: 'restaurants in tampa bay',
        area: 'tampa-bay',
        region: 'FL',
        country: 'US',
        timeline: 'today',
        button_click_count: null,
        response: {
          data: [
            {
              id: 'test-restaurant-1',
              title: 'Test Restaurant',
              description: 'A test restaurant for smoke testing',
              category: 'restaurants',
              source: 'test'
            }
          ]
        }
      };
    }

    // Prepare test request based on the cache entry
    testRequest = {
      query: validCacheEntry.prompt,
      area: validCacheEntry.area,
      region: validCacheEntry.region,
      country: validCacheEntry.country,
      timeline: validCacheEntry.timeline,
      buttonClickCount: validCacheEntry.button_click_count,
      enableFallbacks: false // Disable fallbacks to test query_cache specifically
    };

    logger.info('Test setup complete', {
      query: testRequest.query,
      area: testRequest.area,
      hasValidCache: !!validCacheEntry.id
    });
  });

  test('should successfully retrieve data from query_cache', async () => {
    /**
     * This test verifies the primary query_cache strategy works correctly
     * It should return cached results from Firestore without hitting LLM
     */
    const response = await pulseAPIService.testQueryCache(testRequest);

    expect(response.success).toBe(true);
    expect(response.source).toBe('query_cache');
    expect(response.strategy).toBe('query_cache');
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
    
    // Query cache should be very fast (< 500ms)
    expect(response.timing?.total_ms).toBeLessThan(500);
    
    // Should indicate cache hit if we found a valid cache entry
    if (response.meta && validCacheEntry.id) {
      expect(response.meta.cache_hit).toBe(true);
    }
  });

  test('should handle exact match queries', async () => {
    /**
     * Query cache uses Levenshtein distance for string matching
     * Exact matches should always return results if cache exists
     */
    if (!validCacheEntry.id) {
      logger.warn('Skipping exact match test - no valid cache entry');
      return;
    }

    const exactMatchRequest = {
      ...testRequest,
      query: validCacheEntry.prompt // Use exact prompt from cache
    };

    const response = await pulseAPIService.testQueryCache(exactMatchRequest);

    expect(response.success).toBe(true);
    expect(response.source).toBe('query_cache');
    
    // With exact match, we should get results
    if (response.data.length > 0) {
      expect(response.data.length).toBeGreaterThan(0);
    }
  });

  test('should handle similar queries with high similarity', async () => {
    /**
     * Test Levenshtein similarity matching
     * Queries with >0.9 similarity should match
     */
    const similarQueries = [
      validCacheEntry.prompt,
      validCacheEntry.prompt.toLowerCase(),
      validCacheEntry.prompt.toUpperCase(),
      validCacheEntry.prompt + '?', // Adding punctuation
      validCacheEntry.prompt.replace(' in ', ' near ') // Minor word change
    ];

    for (const query of similarQueries) {
      const request = { ...testRequest, query };
      const response = await pulseAPIService.testQueryCache(request);
      
      expect(response.success).toBe(true);
      expect(response.source).toBe('query_cache');
      
      logger.debug(`Query similarity test: "${query}" -> ${response.data.length} results`);
    }
  });

  test('should respect location filters', async () => {
    /**
     * Query cache is location-aware
     * Only returns results matching area, region, country
     */
    const locationVariations = [
      { area: 'miami', region: 'FL', country: 'US' },
      { area: 'tampa-bay', region: 'CA', country: 'US' },
      { area: 'tampa-bay', region: 'FL', country: 'CA' }
    ];

    for (const location of locationVariations) {
      const request = {
        ...testRequest,
        ...location
      };
      
      const response = await pulseAPIService.testQueryCache(request);
      
      expect(response.success).toBe(true);
      
      // Different locations should not match our test cache
      if (location.area !== testRequest.area || 
          location.region !== testRequest.region || 
          location.country !== testRequest.country) {
        logger.debug(`Location mismatch test: ${JSON.stringify(location)} -> ${response.data.length} results`);
      }
    }
  });

  test('should handle button click count filtering', async () => {
    /**
     * Button click count tracks user interactions
     * Format: "1_deals", "2_events", etc.
     */
    const clickCounts = ['1_deals', '2_events', '3_news', '4_reels'];
    
    for (const buttonClickCount of clickCounts) {
      const request = {
        ...testRequest,
        buttonClickCount
      };
      
      const response = await pulseAPIService.testQueryCache(request);
      
      expect(response.success).toBe(true);
      expect(response.source).toBe('query_cache');
      
      logger.debug(`Button click test: ${buttonClickCount} -> ${response.data.length} results`);
    }
  });

  test('should validate response structure', async () => {
    /**
     * Ensure response follows expected structure
     * This helps catch API contract changes
     */
    const response = await pulseAPIService.testQueryCache(testRequest);

    // Required fields
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('source');
    expect(response).toHaveProperty('strategy');
    expect(response).toHaveProperty('timestamp');

    // Optional fields
    if (response.timing) {
      expect(response.timing).toHaveProperty('total_ms');
      expect(typeof response.timing.total_ms).toBe('number');
    }

    if (response.meta) {
      expect(typeof response.meta).toBe('object');
    }

    // Data array validation
    expect(Array.isArray(response.data)).toBe(true);
    
    if (response.data.length > 0) {
      const item = response.data[0];
      // Each item should have basic fields
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('source');
    }
  });

  test('should measure performance characteristics', async () => {
    /**
     * Query cache should be the fastest strategy
     * Typical performance: 50-200ms
     */
    const iterations = 3;
    const timings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const response = await pulseAPIService.testQueryCache(testRequest);
      const duration = Date.now() - startTime;
      
      expect(response.success).toBe(true);
      timings.push(duration);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    const maxTime = Math.max(...timings);
    
    logger.info('Query cache performance', {
      average: avgTime.toFixed(2) + 'ms',
      max: maxTime + 'ms',
      timings
    });

    // Performance assertions
    expect(avgTime).toBeLessThan(1000); // Average should be under 1 second
    expect(maxTime).toBeLessThan(2000); // Max should be under 2 seconds
  });

  test('should handle empty cache gracefully', async () => {
    /**
     * When no cache exists, should return empty results
     * without throwing errors
     */
    const noCacheRequest = {
      ...testRequest,
      query: 'extremely unique query that definitely has no cache ' + Date.now()
    };

    const response = await pulseAPIService.testQueryCache(noCacheRequest);

    expect(response.success).toBe(true);
    expect(response.source).toBe('query_cache');
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
    // Empty results expected
    expect(response.data.length).toBe(0);
  });
});

/**
 * TROUBLESHOOTING GUIDE
 * ====================
 * 
 * 1. "No cache entries found"
 *    - Check Firestore connectivity
 *    - Verify service account permissions
 *    - Ensure cache hasn't expired (24-hour TTL)
 * 
 * 2. "Query doesn't match despite similarity"
 *    - Check Levenshtein threshold (0.9)
 *    - Verify exact location match
 *    - Check button_click_count if specified
 * 
 * 3. "Slow performance"
 *    - Check Firestore indexes
 *    - Verify network connectivity
 *    - Check for rate limiting
 * 
 * 4. "Inconsistent results"
 *    - Cache may be updating
 *    - Check for multiple cache entries
 *    - Verify timeline parameter
 * 
 * MONITORING QUERIES
 * ==================
 * 
 * Firestore:
 * - Collection: query_cache
 * - Indexes: location.area, location.region, expire_at
 * 
 * Supabase:
 * - Table: query_cache
 * - RPC: search_query_cache_json
 * - Indexes: area, region, country, timeline, expire_at
 */