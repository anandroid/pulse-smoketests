import { supabaseService } from '../services/supabase';
import { pulseAPIService, SearchRequest } from '../services/pulse-api';
import { config } from '../config';
import logger from '../utils/logger';
import { notificationService } from '../services/notifications';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class SmokeTestRunner {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    logger.info('Starting smoke tests...');
    
    try {
      // 1. Test API health
      await this.testAPIHealth();
      
      // 2. Test Supabase connection
      await this.testSupabaseConnection();
      
      // 3. Test Query Cache strategy (fastest)
      await this.testQueryCacheStrategy();
      
      // 4. Test RAG Vector strategy
      await this.testRagVectorStrategy();
      
      // 5. Test other strategies
      await this.testAllStrategies();
      
      // 6. Test performance
      await this.testPerformance();
      
      // 7. Generate report
      const report = this.generateReport();
      logger.info('Test Report:', report);
      
      // 8. Send notifications if failures
      if (report.hasFailures) {
        await notificationService.sendTestFailureAlert(report);
      }
      
    } catch (error) {
      logger.error('Fatal error during smoke tests:', error);
      await notificationService.sendCriticalAlert('Smoke tests failed to complete', error);
    }
  }

  private async testAPIHealth(): Promise<void> {
    const startTime = Date.now();
    try {
      const isHealthy = await pulseAPIService.healthCheck();
      this.results.push({
        testName: 'API Health Check',
        success: isHealthy,
        duration: Date.now() - startTime,
        error: isHealthy ? undefined : 'API is not healthy',
      });
    } catch (error) {
      this.results.push({
        testName: 'API Health Check',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async testSupabaseConnection(): Promise<void> {
    const startTime = Date.now();
    try {
      const entry = await supabaseService.getRecentCacheEntry();
      this.results.push({
        testName: 'Supabase Connection',
        success: entry !== null,
        duration: Date.now() - startTime,
        details: entry ? { id: entry.id, prompt: entry.prompt } : null,
      });
    } catch (error) {
      this.results.push({
        testName: 'Supabase Connection',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async testQueryCacheStrategy(): Promise<void> {
    const startTime = Date.now();
    try {
      // Find a valid cache entry to test with
      const cacheEntries = await supabaseService.getCacheEntriesByPrompt('', 5);
      const validEntry = cacheEntries.find(entry => 
        entry.response?.data?.length > 0 && 
        new Date(entry.expire_at) > new Date()
      );

      if (!validEntry) {
        this.results.push({
          testName: 'Query Cache Strategy',
          success: false,
          duration: Date.now() - startTime,
          error: 'No valid cache entries found for testing',
        });
        return;
      }

      // Test with the exact query from cache
      const request: SearchRequest = {
        query: validEntry.prompt,
        area: validEntry.area,
        region: validEntry.region || undefined,
        country: validEntry.country || undefined,
        timeline: validEntry.timeline || undefined,
        buttonClickCount: validEntry.button_click_count || undefined,
        enableFallbacks: false,
      };

      const response = await pulseAPIService.testQueryCache(request);
      
      this.results.push({
        testName: 'Query Cache Strategy',
        success: response.success,
        duration: Date.now() - startTime,
        details: {
          itemCount: response.data.length,
          timing: response.timing,
          source: response.source,
          cacheHit: response.meta?.cache_hit,
          testedQuery: validEntry.prompt,
        },
        error: response.error,
      });
    } catch (error) {
      this.results.push({
        testName: 'Query Cache Strategy',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async testRagVectorStrategy(): Promise<void> {
    const startTime = Date.now();
    try {
      // Get a cache entry to test with
      const cacheEntry = await supabaseService.getRecentCacheEntry({
        area: config.TEST_AREA,
        region: config.TEST_REGION,
      });

      const request: SearchRequest = {
        query: cacheEntry?.prompt || 'pizza deals today',
        area: cacheEntry?.area || config.TEST_AREA,
        region: cacheEntry?.region || config.TEST_REGION,
        country: cacheEntry?.country || config.TEST_COUNTRY,
        timeline: cacheEntry?.timeline || config.TEST_TIMELINE,
        buttonClickCount: cacheEntry?.button_click_count || undefined,
        enableFallbacks: false,
      };

      const response = await pulseAPIService.testRagVector(request);
      
      this.results.push({
        testName: 'RAG Vector Strategy',
        success: response.success,
        duration: Date.now() - startTime,
        details: {
          itemCount: response.data.length,
          timing: response.timing,
          source: response.source,
        },
        error: response.error || (response.data.length === 0 ? 'No data returned' : undefined),
      });
    } catch (error) {
      this.results.push({
        testName: 'RAG Vector Strategy',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async testAllStrategies(): Promise<void> {
    const strategies = [
      { name: 'Query Cache', method: 'testQueryCache' },
      { name: 'RAG Cache', method: 'testRagCache' },
      { name: 'RAG Hybrid', method: 'testRagHybrid' },
      { name: 'Web Search LLM', method: 'testWebSearchLLM' },
    ];

    const request: SearchRequest = {
      query: 'restaurants near me',
      area: config.TEST_AREA,
      region: config.TEST_REGION,
      enableFallbacks: false,
    };

    for (const strategy of strategies) {
      const startTime = Date.now();
      try {
        const response = await (pulseAPIService as any)[strategy.method](request);
        this.results.push({
          testName: `${strategy.name} Strategy`,
          success: response.success,
          duration: Date.now() - startTime,
          details: {
            itemCount: response.data?.length || 0,
            timing: response.timing,
          },
          error: response.error,
        });
      } catch (error) {
        this.results.push({
          testName: `${strategy.name} Strategy`,
          success: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private async testPerformance(): Promise<void> {
    const performanceTests = [
      { strategy: 'query_cache', expectedMs: 500 },
      { strategy: 'rag_cache', expectedMs: 1000 },
      { strategy: 'rag_vector', expectedMs: 3000 },
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      try {
        const response = await pulseAPIService.searchWithStrategy(test.strategy, {
          query: 'test performance',
          area: config.TEST_AREA,
          enableFallbacks: false,
        });

        const duration = Date.now() - startTime;
        const withinExpected = duration <= test.expectedMs;

        this.results.push({
          testName: `${test.strategy} Performance`,
          success: response.success && withinExpected,
          duration,
          details: {
            expectedMs: test.expectedMs,
            actualMs: duration,
            withinExpected,
          },
          error: withinExpected ? undefined : `Exceeded expected time: ${duration}ms > ${test.expectedMs}ms`,
        });
      } catch (error) {
        this.results.push({
          testName: `${test.strategy} Performance`,
          success: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private generateReport(): any {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const hasFailures = failedTests > 0;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      hasFailures,
      successRate: (passedTests / totalTests * 100).toFixed(2) + '%',
      totalDuration: totalDuration + 'ms',
      results: this.results,
      failures: this.results.filter(r => !r.success),
    };
  }
}

// Run smoke tests if called directly
if (require.main === module) {
  const runner = new SmokeTestRunner();
  runner.runAllTests()
    .then(() => {
      logger.info('Smoke tests completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Smoke tests failed:', error);
      process.exit(1);
    });
}

export default SmokeTestRunner;