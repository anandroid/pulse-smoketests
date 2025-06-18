import { supabaseService } from '../services/supabase';
import { pulseAPIService } from '../services/pulse-api';
import { config } from '../config';
import logger from '../utils/logger';

describe('RAG Vector Strategy Smoke Tests', () => {
  let cacheEntry: any;

  beforeAll(async () => {
    // Get a recent cache entry from Supabase
    cacheEntry = await supabaseService.getRecentCacheEntry({
      area: config.TEST_AREA,
      region: config.TEST_REGION,
      country: config.TEST_COUNTRY,
      timeline: config.TEST_TIMELINE,
    });

    if (!cacheEntry) {
      logger.warn('No cache entry found, using fallback test data');
      cacheEntry = {
        prompt: 'pizza deals today',
        area: config.TEST_AREA,
        region: config.TEST_REGION,
        country: config.TEST_COUNTRY,
        timeline: config.TEST_TIMELINE,
        button_click_count: '1_deals',
      };
    }
  });

  test('should successfully retrieve data using rag_vector strategy', async () => {
    const request = {
      query: cacheEntry.prompt,
      area: cacheEntry.area,
      region: cacheEntry.region,
      country: cacheEntry.country,
      timeline: cacheEntry.timeline,
      buttonClickCount: cacheEntry.button_click_count,
      enableFallbacks: false, // Disable fallbacks for direct strategy testing
    };

    const response = await pulseAPIService.testRagVector(request);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.source).toBe('rag_vector');
    expect(response.strategy).toBe('rag_vector');
    expect(response.timing).toBeDefined();
    expect(response.timing?.total_ms).toBeGreaterThan(0);
  });

  test('should return relevant results for the query', async () => {
    const request = {
      query: cacheEntry.prompt,
      area: cacheEntry.area,
      region: cacheEntry.region,
      country: cacheEntry.country,
      timeline: cacheEntry.timeline,
    };

    const response = await pulseAPIService.testRagVector(request);

    expect(response.success).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);

    // Verify data structure
    const firstItem = response.data[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('title');
    expect(firstItem).toHaveProperty('description');
    expect(firstItem).toHaveProperty('source');
  });

  test('should handle missing optional parameters', async () => {
    const request = {
      query: 'restaurants near me',
      area: config.TEST_AREA,
    };

    const response = await pulseAPIService.testRagVector(request);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });

  test('should validate required parameters', async () => {
    const request = {
      query: '', // Empty query should fail
      area: config.TEST_AREA,
    };

    const response = await pulseAPIService.testRagVector(request);

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });

  test('should respect performance expectations', async () => {
    const request = {
      query: cacheEntry.prompt,
      area: cacheEntry.area,
      region: cacheEntry.region,
      country: cacheEntry.country,
    };

    const startTime = Date.now();
    const response = await pulseAPIService.testRagVector(request);
    const duration = Date.now() - startTime;

    expect(response.success).toBe(true);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(response.timing?.total_ms).toBeLessThan(3000); // API processing should be under 3 seconds
  });

  test('should handle device-specific deduplication', async () => {
    const deviceId = 'test-device-123';
    const request = {
      query: cacheEntry.prompt,
      area: cacheEntry.area,
      deviceId: deviceId,
    };

    const response = await pulseAPIService.testRagVector(request);

    expect(response.success).toBe(true);
    if (response.meta?.session_filtered !== undefined) {
      expect(typeof response.meta.session_filtered).toBe('boolean');
    }
  });

  test('should handle button click count filtering', async () => {
    const request = {
      query: cacheEntry.prompt,
      area: cacheEntry.area,
      buttonClickCount: '1_deals',
    };

    const response = await pulseAPIService.testRagVector(request);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    
    // Results should be relevant to deals category
    if (response.data.length > 0) {
      const hasDeals = response.data.some(item => 
        item.category === 'deals' || 
        item.title?.toLowerCase().includes('deal') ||
        item.description?.toLowerCase().includes('deal')
      );
      expect(hasDeals).toBe(true);
    }
  });
});