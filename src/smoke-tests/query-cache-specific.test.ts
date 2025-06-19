/**
 * Specific Query Cache Test using known cache entries
 * 
 * This test uses actual cache entries found in the database
 * to ensure we get cache hits and validate the complete flow
 */

import { pulseAPIService } from '../services/pulse-api';
import logger from '../utils/logger';

describe('Query Cache Specific Entry Tests', () => {
  /**
   * Test with actual cache entry found in database:
   * - Prompt: "restaurants near me"
   * - Area: tampa-bay
   * - Region: FL
   * - Country: US
   * 
   * This entry contains 10 restaurant results including Michelin-starred restaurants
   */
  test('should retrieve cached Tampa Bay restaurants', async () => {
    const request = {
      query: 'restaurants near me',
      area: 'tampa-bay',
      region: 'FL',
      country: 'US',
      timeline: null as any,
      buttonClickCount: null as any,
      enableFallbacks: false
    };

    logger.info('Testing with known cache entry', request);
    
    const response = await pulseAPIService.testQueryCache(request);
    
    // Should get successful response
    expect(response.success).toBe(true);
    expect(response.source).toBe('query_cache');
    expect(response.strategy).toBe('query_cache');
    
    // Should have data
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
    
    // Based on the cache we found, should have 10 restaurants
    if (response.data.length > 0) {
      expect(response.data.length).toBeGreaterThanOrEqual(5);
      
      // Validate first item structure
      const firstItem = response.data[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('title');
      expect(firstItem).toHaveProperty('description');
      expect(firstItem).toHaveProperty('category');
      expect(firstItem).toHaveProperty('location');
      
      // Should be restaurant/place category
      expect(['places', 'restaurants', 'dining']).toContain(firstItem.category);
      
      logger.info('Cache hit successful', {
        itemCount: response.data.length,
        firstItem: firstItem.title,
        category: firstItem.category
      });
    }
    
    // Performance should be excellent for cache hit
    expect(response.timing?.total_ms).toBeLessThan(300);
  });

  /**
   * Test other known cache entries
   */
  const knownCacheEntries = [
    {
      query: 'Show me arts things to do in Tampa Bay',
      area: 'tampa-bay',
      region: 'FL',
      country: 'US'
    },
    {
      query: 'Show me deals things to do in Tampa Bay',
      area: 'tampa-bay',
      region: 'FL',
      country: 'US'
    },
    {
      query: 'Show me dining things to do in Tampa Bay',
      area: 'tampa-bay',
      region: 'FL',
      country: 'US'
    },
    {
      query: 'Show me family-friendly things to do in Tampa Bay',
      area: 'tampa-bay',
      region: 'FL',
      country: 'US'
    }
  ];

  test.each(knownCacheEntries)('should retrieve cached results for: $query', async (entry) => {
    const request = {
      ...entry,
      timeline: null as any,
      buttonClickCount: null as any,
      enableFallbacks: false
    };

    const response = await pulseAPIService.testQueryCache(request);
    
    expect(response.success).toBe(true);
    expect(response.source).toBe('query_cache');
    
    // Log results for debugging
    logger.info(`Cache test for "${entry.query}"`, {
      success: response.success,
      itemCount: response.data?.length || 0,
      timing: response.timing?.total_ms
    });
  });

  /**
   * Test exact string matching behavior
   */
  test('should handle exact vs similar queries', async () => {
    const baseRequest = {
      area: 'tampa-bay',
      region: 'FL',
      country: 'US',
      timeline: null as any,
      buttonClickCount: null as any,
      enableFallbacks: false
    };

    // Exact match
    const exactResponse = await pulseAPIService.testQueryCache({
      ...baseRequest,
      query: 'restaurants near me'
    });

    // Slightly different (should still match with Levenshtein)
    const similarResponse = await pulseAPIService.testQueryCache({
      ...baseRequest,
      query: 'restaurants near me?'
    });

    // Very different (should not match)
    const differentResponse = await pulseAPIService.testQueryCache({
      ...baseRequest,
      query: 'pizza places in tampa'
    });

    logger.info('String matching test results', {
      exact: { success: exactResponse.success, items: exactResponse.data.length },
      similar: { success: similarResponse.success, items: similarResponse.data.length },
      different: { success: differentResponse.success, items: differentResponse.data.length }
    });

    // Exact should definitely work
    expect(exactResponse.success).toBe(true);
    
    // Similar might work depending on Levenshtein threshold
    expect(similarResponse.success).toBe(true);
    
    // Different should have no results
    expect(differentResponse.data.length).toBe(0);
  });
});