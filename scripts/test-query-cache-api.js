#!/usr/bin/env node

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const API_BASE_URL = process.env.PULSE_API_BASE_URL || 'http://localhost:8080';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test cases
const testCases = [
  {
    name: 'Basic query_cache search',
    request: {
      query: 'events tonight',
      area: 'tampa-bay'
    }
  },
  {
    name: 'Query with full location params',
    request: {
      query: 'pizza deals',
      area: 'miami',
      region: 'FL',
      country: 'US',
      timeline: 'today'
    }
  },
  {
    name: 'Query with button click count',
    request: {
      query: 'restaurant specials',
      area: 'orlando',
      buttonClickCount: '1_deals'
    }
  },
  {
    name: 'Query with device ID for deduplication',
    request: {
      query: 'live music',
      area: 'tampa-bay',
      deviceId: 'test-device-123'
    }
  },
  {
    name: 'Query with fallbacks disabled',
    request: {
      query: 'tech events',
      area: 'miami',
      enableFallbacks: false
    }
  }
];

async function testQueryCacheAPI() {
  console.log('🚀 Testing Query Cache API\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  // First, let's get a real cache entry from Supabase
  console.log('📊 Fetching real cache entry from Supabase...');
  try {
    const { data: cacheEntries, error } = await supabase
      .from('query_cache')
      .select('*')
      .gte('expire_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && cacheEntries && cacheEntries.length > 0) {
      const realEntry = cacheEntries[0];
      console.log('✅ Found real cache entry:');
      console.log(`   Prompt: "${realEntry.prompt}"`);
      console.log(`   Area: ${realEntry.area}`);
      console.log(`   Created: ${realEntry.created_at}\n`);

      // Add a test case with real data
      testCases.unshift({
        name: 'Real cache entry search',
        request: {
          query: realEntry.prompt,
          area: realEntry.area,
          region: realEntry.region,
          country: realEntry.country,
          timeline: realEntry.timeline,
          buttonClickCount: realEntry.button_click_count
        }
      });
    } else {
      console.log('⚠️  No valid cache entries found in Supabase\n');
    }
  } catch (error) {
    console.error('❌ Error fetching from Supabase:', error.message, '\n');
  }

  // Run test cases
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('Request:', JSON.stringify(testCase.request, null, 2));
    
    try {
      const startTime = Date.now();
      const response = await axios.post(
        `${API_BASE_URL}/api/search/query_cache`,
        testCase.request,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            ...(testCase.request.deviceId && { 'X-Device-ID': testCase.request.deviceId })
          }
        }
      );
      const duration = Date.now() - startTime;

      console.log(`✅ Success (${duration}ms)`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Source: ${response.data.source}`);
      console.log(`   Strategy: ${response.data.strategy}`);
      console.log(`   Items returned: ${response.data.data?.length || 0}`);
      console.log(`   Cache hit: ${response.data.meta?.cache_hit || false}`);
      console.log(`   Timing: ${response.data.timing?.total_ms || 'N/A'}ms`);
      
      if (response.data.fallbackUsed) {
        console.log(`   Fallback used: ${response.data.fallbackUsed}`);
      }
      
      if (response.data.data && response.data.data.length > 0) {
        console.log(`   First item: ${response.data.data[0].title || response.data.data[0].name}`);
      }
    } catch (error) {
      console.log(`❌ Failed`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data?.error || error.message}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
  }

  // Test error cases
  console.log('\n\n🔥 Testing Error Cases\n');
  
  const errorCases = [
    {
      name: 'Missing query parameter',
      request: { area: 'tampa-bay' }
    },
    {
      name: 'Empty query',
      request: { query: '', area: 'miami' }
    }
  ];

  for (const errorCase of errorCases) {
    console.log(`📝 Test: ${errorCase.name}`);
    console.log('Request:', JSON.stringify(errorCase.request, null, 2));
    
    try {
      await axios.post(
        `${API_BASE_URL}/api/search/query_cache`,
        errorCase.request,
        { timeout: 5000 }
      );
      console.log('❌ Expected error but request succeeded');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly returned 400 error');
        console.log(`   Error: ${error.response.data?.error}`);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
  }

  console.log('\n\n✨ Testing complete!\n');
}

// Run the tests
testQueryCacheAPI().catch(console.error);