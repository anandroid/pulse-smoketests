#!/usr/bin/env node

/**
 * Script to find valid query_cache entries from Supabase
 * and test them against the API
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findValidCacheEntries() {
  console.log('🔍 Searching for valid cache entries...\n');
  
  try {
    // Get recent cache entries that haven't expired
    const { data, error } = await supabase
      .from('query_cache')
      .select('*')
      .gte('expire_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching cache entries:', error);
      return [];
    }

    // Filter for entries with valid responses
    const validEntries = data.filter(entry => {
      return entry.response && 
             entry.response.data && 
             entry.response.data.length > 0;
    });

    console.log(`✅ Found ${validEntries.length} valid cache entries\n`);
    
    return validEntries;
  } catch (error) {
    console.error('❌ Failed to fetch cache entries:', error);
    return [];
  }
}

async function testCacheEntry(entry) {
  const apiUrl = process.env.PULSE_API_BASE_URL || 'https://pulse-apis-269146618053.us-central1.run.app';
  
  console.log(`\n📝 Testing cache entry: ${entry.id}`);
  console.log(`   Query: "${entry.prompt}"`);
  console.log(`   Location: ${entry.area}, ${entry.region}, ${entry.country}`);
  console.log(`   Timeline: ${entry.timeline || 'none'}`);
  console.log(`   Button Click: ${entry.button_click_count || 'none'}`);
  
  const requestBody = {
    query: entry.prompt,
    area: entry.area,
    region: entry.region,
    country: entry.country,
    timeline: entry.timeline,
    buttonClickCount: entry.button_click_count,
    enableFallbacks: false
  };

  try {
    console.log('\n🚀 Making API request...');
    const startTime = Date.now();
    
    const response = await axios.post(
      `${apiUrl}/api/search/query_cache`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const duration = Date.now() - startTime;
    
    console.log(`✅ Success! Response time: ${duration}ms`);
    console.log(`   Source: ${response.data.source}`);
    console.log(`   Items returned: ${response.data.data?.length || 0}`);
    console.log(`   Cache hit: ${response.data.meta?.cache_hit || 'unknown'}`);
    
    return {
      success: true,
      entry,
      duration,
      itemCount: response.data.data?.length || 0
    };
  } catch (error) {
    console.error(`❌ API request failed:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data)}`);
    }
    
    return {
      success: false,
      entry,
      error: error.message
    };
  }
}

async function generateCurlCommand(entry) {
  const apiUrl = process.env.PULSE_API_BASE_URL || 'https://pulse-apis-269146618053.us-central1.run.app';
  
  const requestBody = {
    query: entry.prompt,
    area: entry.area,
    region: entry.region,
    country: entry.country,
    timeline: entry.timeline,
    buttonClickCount: entry.button_click_count
  };

  const curlCommand = `curl -X POST "${apiUrl}/api/search/query_cache" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(requestBody, null, 2).replace(/'/g, "\\'")}'`;

  return curlCommand;
}

async function main() {
  console.log('🔐 Query Cache Entry Finder\n');
  
  // Check environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables. Please run: npm run fetch-secrets');
    process.exit(1);
  }

  // Find valid cache entries
  const entries = await findValidCacheEntries();
  
  if (entries.length === 0) {
    console.log('❌ No valid cache entries found');
    return;
  }

  // Show summary
  console.log('\n📊 Cache Entry Summary:');
  entries.slice(0, 5).forEach((entry, index) => {
    console.log(`\n${index + 1}. "${entry.prompt}"`);
    console.log(`   Location: ${entry.area}, ${entry.region || 'N/A'}, ${entry.country || 'N/A'}`);
    console.log(`   Created: ${new Date(entry.created_at).toLocaleString()}`);
    console.log(`   Expires: ${new Date(entry.expire_at).toLocaleString()}`);
    console.log(`   Results: ${entry.response?.data?.length || 0} items`);
  });

  // Test the first valid entry
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Testing first valid entry...');
  
  const testResult = await testCacheEntry(entries[0]);
  
  if (testResult.success) {
    console.log('\n✅ Test successful!');
    console.log('\n📋 Example CURL command:');
    console.log(await generateCurlCommand(entries[0]));
  } else {
    console.log('\n❌ Test failed');
  }

  // Show statistics
  console.log('\n' + '='.repeat(60));
  console.log('📈 Statistics:');
  console.log(`   Total cache entries: ${entries.length}`);
  console.log(`   Average response items: ${
    entries.reduce((sum, e) => sum + (e.response?.data?.length || 0), 0) / entries.length
  }`);
  
  const areas = [...new Set(entries.map(e => e.area))];
  console.log(`   Unique areas: ${areas.join(', ')}`);
  
  const models = [...new Set(entries.map(e => e.model))];
  console.log(`   Models used: ${models.join(', ')}`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});