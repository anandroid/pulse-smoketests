#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getQueryCacheExample() {
  try {
    console.log('Fetching query_cache entries from Supabase...\n');

    // Get the most recent valid cache entry
    const { data, error } = await supabase
      .from('query_cache')
      .select('*')
      .gte('expire_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Error fetching cache entries:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No valid cache entries found.');
      console.log('\nTrying to get any cache entry (including expired)...');
      
      const { data: anyData, error: anyError } = await supabase
        .from('query_cache')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (anyData && anyData.length > 0) {
        console.log('\nFound expired entries:');
        anyData.forEach((entry, index) => {
          console.log(`\n--- Entry ${index + 1} ---`);
          console.log('ID:', entry.id);
          console.log('Prompt:', entry.prompt);
          console.log('Area:', entry.area);
          console.log('Region:', entry.region);
          console.log('Country:', entry.country);
          console.log('Timeline:', entry.timeline);
          console.log('Button Click Count:', entry.button_click_count);
          console.log('Model:', entry.model);
          console.log('Created At:', entry.created_at);
          console.log('Expire At:', entry.expire_at);
          console.log('Result (truncated):', JSON.stringify(entry.result).substring(0, 200) + '...');
        });
      }
      return;
    }

    console.log(`Found ${data.length} valid cache entries.\n`);

    // Display the first entry in detail
    const firstEntry = data[0];
    console.log('=== Example Query Cache Entry ===\n');
    console.log('ID:', firstEntry.id);
    console.log('Prompt:', firstEntry.prompt);
    console.log('Area:', firstEntry.area);
    console.log('Region:', firstEntry.region);
    console.log('Country:', firstEntry.country);
    console.log('Timeline:', firstEntry.timeline);
    console.log('Button Click Count:', firstEntry.button_click_count);
    console.log('Model:', firstEntry.model);
    console.log('Created At:', firstEntry.created_at);
    console.log('Expire At:', firstEntry.expire_at);
    console.log('\n--- Result Structure ---');
    console.log('Type of result:', typeof firstEntry.result);
    console.log('Result keys:', firstEntry.result ? Object.keys(firstEntry.result) : 'null');
    
    if (firstEntry.result && firstEntry.result.data && Array.isArray(firstEntry.result.data)) {
      console.log('Number of items in result.data:', firstEntry.result.data.length);
      if (firstEntry.result.data.length > 0) {
        console.log('\nFirst item in result.data:');
        console.log(JSON.stringify(firstEntry.result.data[0], null, 2));
      }
    }

    // Create example API request body
    console.log('\n\n=== Example API Request Body ===');
    const apiRequest = {
      query: firstEntry.prompt,
      area: firstEntry.area,
      region: firstEntry.region,
      country: firstEntry.country,
      timeline: firstEntry.timeline,
      buttonClickCount: firstEntry.button_click_count
    };
    console.log(JSON.stringify(apiRequest, null, 2));

    // Show curl command
    console.log('\n=== Example CURL Command ===');
    const curlCommand = `curl -X POST "http://localhost:8080/api/search/query_cache" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(apiRequest)}'`;
    console.log(curlCommand);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
getQueryCacheExample();