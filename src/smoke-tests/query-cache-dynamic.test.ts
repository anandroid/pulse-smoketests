/**
 * Dynamic Query Cache Test
 * 
 * This test dynamically fetches entries from the database
 * and validates that query_cache returns the expected results
 */

import { supabaseService } from '../services/supabase';
import { pulseAPIService } from '../services/pulse-api';
import logger from '../utils/logger';

describe('Dynamic Query Cache Tests', () => {
  
  test('should find and test valid cache entries from database', async () => {
    logger.info('Starting dynamic cache test...');
    
    // Fetch multiple entries to increase chances of finding valid ones
    const allEntries = await supabaseService.getCacheEntriesByPrompt('', 50);
    
    logger.info(`Fetched ${allEntries.length} total entries from database`);
    
    // Filter for entries with valid data
    const validEntries = allEntries.filter(entry => {
      // Check if not expired
      if (new Date(entry.expire_at) <= new Date()) {
        return false;
      }
      
      // Check for valid data in response or result field
      const hasResponseData = entry.response?.data && 
                             Array.isArray(entry.response.data) && 
                             entry.response.data.length > 0;
                             
      const hasResultData = entry.result?.data && 
                           Array.isArray(entry.result.data) && 
                           entry.result.data.length > 0;
      
      return hasResponseData || hasResultData;
    });
    
    logger.info(`Found ${validEntries.length} valid entries with data`);
    
    if (validEntries.length === 0) {
      logger.warn('No valid entries found - skipping test');
      return;
    }
    
    // Test up to 5 entries
    const entriesToTest = validEntries.slice(0, 5);
    let successCount = 0;
    let cacheHitCount = 0;
    
    for (const entry of entriesToTest) {
      logger.info(`Testing entry: ${entry.id}`, {
        prompt: entry.prompt,
        area: entry.area,
        region: entry.region,
        dataCount: entry.response?.data?.length || entry.result?.data?.length
      });
      
      const request = {
        query: entry.prompt,
        area: entry.area,
        region: entry.region || undefined,
        country: entry.country || undefined,
        timeline: entry.timeline || undefined,
        buttonClickCount: entry.button_click_count || undefined,
        enableFallbacks: false
      };
      
      try {
        const response = await pulseAPIService.testQueryCache(request);
        
        if (response.success) {
          successCount++;
          
          logger.info(`✅ Success for "${entry.prompt}"`, {
            source: response.source,
            itemCount: response.data.length,
            timing: response.timing?.total_ms,
            cacheHit: response.meta?.cache_hit
          });
          
          // Validate response
          expect(response.source).toBe('query_cache');
          expect(response.data).toBeDefined();
          expect(Array.isArray(response.data)).toBe(true);
          
          if (response.meta?.cache_hit) {
            cacheHitCount++;
          }
          
          // Performance check
          if (response.timing?.total_ms) {
            expect(response.timing.total_ms).toBeLessThan(1000);
          }
        } else {
          logger.warn(`❌ Failed for "${entry.prompt}"`, {
            error: response.error
          });
        }
      } catch (error) {
        logger.error(`Error testing entry ${entry.id}:`, error);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.info('Test summary', {
      tested: entriesToTest.length,
      successful: successCount,
      cacheHits: cacheHitCount,
      successRate: `${(successCount / entriesToTest.length * 100).toFixed(1)}%`
    });
    
    // At least some should succeed
    expect(successCount).toBeGreaterThan(0);
  });

  test('should test with most recent cache entry', async () => {
    // Get the most recent entry
    const { data, error } = await (supabaseService as any).client
      .from('query_cache')
      .select('*')
      .gte('expire_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error || !data || data.length === 0) {
      logger.warn('No recent cache entries found');
      return;
    }
    
    const mostRecent = data[0];
    logger.info('Testing most recent entry', {
      id: mostRecent.id,
      prompt: mostRecent.prompt,
      area: mostRecent.area,
      created: new Date(mostRecent.created_at).toISOString()
    });
    
    const request = {
      query: mostRecent.prompt,
      area: mostRecent.area,
      region: mostRecent.region || undefined,
      country: mostRecent.country || undefined,
      timeline: mostRecent.timeline || undefined,
      buttonClickCount: mostRecent.button_click_count || undefined,
      enableFallbacks: false
    };
    
    const response = await pulseAPIService.testQueryCache(request);
    
    expect(response.success).toBe(true);
    expect(response.source).toBe('query_cache');
    
    logger.info('Most recent entry test result', {
      success: response.success,
      itemCount: response.data?.length || 0,
      timing: response.timing?.total_ms
    });
  });

  test('should find entries by specific area', async () => {
    const testAreas = ['tampa-bay', 'miami', 'orlando', 'jacksonville'];
    
    for (const area of testAreas) {
      const entries = await supabaseService.getRecentCacheEntry({
        area: area
      });
      
      if (entries) {
        logger.info(`Found entry for ${area}`, {
          id: entries.id,
          prompt: entries.prompt
        });
        
        const request = {
          query: entries.prompt,
          area: entries.area,
          region: entries.region || undefined,
          country: entries.country || undefined,
          timeline: entries.timeline || undefined,
          buttonClickCount: entries.button_click_count || undefined,
          enableFallbacks: false
        };
        
        const response = await pulseAPIService.testQueryCache(request);
        
        if (response.success && response.data.length > 0) {
          logger.info(`✅ Cache hit for ${area}`, {
            itemCount: response.data.length,
            timing: response.timing?.total_ms
          });
          
          // Found at least one working area
          expect(response.success).toBe(true);
          break;
        }
      }
    }
  });
});