#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testSpecificCacheEntry() {
  const apiUrl = process.env.PULSE_API_BASE_URL || 'https://pulse-apis-269146618053.us-central1.run.app';
  
  // Test with the exact data we found
  const testCases = [
    {
      name: 'Restaurants near me - Tampa Bay',
      request: {
        query: 'restaurants near me',
        area: 'tampa-bay',
        region: 'FL',
        country: 'US',
        timeline: null,
        buttonClickCount: null,
        enableFallbacks: false
      }
    },
    {
      name: 'Coffee shops - Tampa Bay',
      request: {
        query: 'Show me coffee things to do in Tampa Bay',
        area: 'tampa-bay',
        region: 'FL',
        country: 'US',
        timeline: null,
        buttonClickCount: null,
        enableFallbacks: false
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log('Request:', JSON.stringify(testCase.request, null, 2));
    
    try {
      const startTime = Date.now();
      const response = await axios.post(
        `${apiUrl}/api/search/query_cache`,
        testCase.request,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      const duration = Date.now() - startTime;
      
      console.log(`\nResponse time: ${duration}ms`);
      console.log('Status:', response.status);
      console.log('Success:', response.data.success);
      console.log('Source:', response.data.source);
      console.log('Strategy:', response.data.strategy);
      console.log('Items returned:', response.data.data?.length || 0);
      console.log('Cache hit:', response.data.meta?.cache_hit);
      console.log('Timing:', response.data.timing);
      
      if (response.data.data && response.data.data.length > 0) {
        console.log('\nFirst item:');
        console.log(JSON.stringify(response.data.data[0], null, 2));
      } else {
        console.log('\n⚠️  No data returned from cache');
        console.log('Fallback used:', response.data.fallbackUsed);
        console.log('Fallback chain:', response.data.fallbackChain);
      }
      
    } catch (error) {
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('CURL command to test manually:');
  console.log(`curl -X POST "${apiUrl}/api/search/query_cache" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "restaurants near me",
    "area": "tampa-bay",
    "region": "FL",
    "country": "US",
    "timeline": null,
    "buttonClickCount": null,
    "enableFallbacks": false
  }'`);
}

testSpecificCacheEntry().catch(console.error);