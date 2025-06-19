#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchQueryCacheEntries(options = {}) {
  const {
    limit = 20,
    onlyWithResponses = true,
    area = null,
    region = null,
    country = null,
    timeline = null,
    showFullResponse = false,
    saveToFile = false
  } = options;

  try {
    console.log('Fetching query cache entries from Supabase...\n');
    
    // Build query
    let query = supabase
      .from('query_cache')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add filters if specified
    if (area) query = query.eq('area', area);
    if (region) query = query.eq('region', region);
    if (country) query = query.eq('country', country);
    if (timeline) query = query.eq('timeline', timeline);
    
    // Only get entries that haven't expired
    query = query.gte('expire_at', new Date().toISOString());

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No cache entries found.');
      return;
    }

    // Filter for entries with non-empty responses if requested
    let entries = data;
    if (onlyWithResponses) {
      entries = data.filter(entry => 
        entry.response && 
        (typeof entry.response === 'object' ? Object.keys(entry.response).length > 0 : true)
      );
    }

    console.log(`Found ${entries.length} cache entries${onlyWithResponses ? ' with responses' : ''}:\n`);

    // Display entries
    const displayData = [];
    entries.forEach((entry, index) => {
      console.log(`\n${'-'.repeat(80)}`);
      console.log(`Entry #${index + 1}`);
      console.log(`${'-'.repeat(80)}`);
      
      console.log(`ID: ${entry.id}`);
      console.log(`Created: ${new Date(entry.created_at).toLocaleString()}`);
      console.log(`Expires: ${new Date(entry.expire_at).toLocaleString()}`);
      console.log(`\nQuery Parameters:`);
      console.log(`  Prompt: "${entry.prompt}"`);
      console.log(`  Area: ${entry.area || 'null'}`);
      console.log(`  Region: ${entry.region || 'null'}`);
      console.log(`  Country: ${entry.country || 'null'}`);
      console.log(`  Timeline: ${entry.timeline || 'null'}`);
      console.log(`  Button Click Count: ${entry.button_click_count || 'null'}`);
      
      console.log(`\nModel Info:`);
      console.log(`  Provider: ${entry.provider}`);
      console.log(`  Model: ${entry.model}`);
      
      if (entry.response) {
        console.log(`\nResponse Preview:`);
        if (showFullResponse) {
          console.log(JSON.stringify(entry.response, null, 2));
        } else {
          const responseStr = JSON.stringify(entry.response);
          const preview = responseStr.length > 200 
            ? responseStr.substring(0, 200) + '...' 
            : responseStr;
          console.log(preview);
        }
      }

      // Collect data for file export
      displayData.push({
        id: entry.id,
        prompt: entry.prompt,
        area: entry.area,
        region: entry.region,
        country: entry.country,
        timeline: entry.timeline,
        button_click_count: entry.button_click_count,
        provider: entry.provider,
        model: entry.model,
        created_at: entry.created_at,
        expire_at: entry.expire_at,
        response: entry.response
      });
    });

    // Save to file if requested
    if (saveToFile) {
      const filename = `query-cache-entries-${new Date().toISOString().split('T')[0]}.json`;
      const filepath = join(__dirname, '..', 'test-data', filename);
      
      await fs.mkdir(join(__dirname, '..', 'test-data'), { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(displayData, null, 2));
      
      console.log(`\n\nData saved to: ${filepath}`);
    }

    // Show summary statistics
    console.log(`\n${'='.repeat(80)}`);
    console.log('Summary Statistics:');
    console.log(`${'='.repeat(80)}`);
    
    // Count by area
    const areaCounts = {};
    entries.forEach(entry => {
      const area = entry.area || 'null';
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });
    
    console.log('\nEntries by Area:');
    Object.entries(areaCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([area, count]) => {
        console.log(`  ${area}: ${count}`);
      });

    // Count by timeline
    const timelineCounts = {};
    entries.forEach(entry => {
      const timeline = entry.timeline || 'null';
      timelineCounts[timeline] = (timelineCounts[timeline] || 0) + 1;
    });
    
    console.log('\nEntries by Timeline:');
    Object.entries(timelineCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([timeline, count]) => {
        console.log(`  ${timeline}: ${count}`);
      });

    // Count by provider
    const providerCounts = {};
    entries.forEach(entry => {
      const provider = entry.provider || 'unknown';
      providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    });
    
    console.log('\nEntries by Provider:');
    Object.entries(providerCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([provider, count]) => {
        console.log(`  ${provider}: ${count}`);
      });

    // Show example test data format
    if (entries.length > 0) {
      const exampleEntry = entries[0];
      console.log(`\n${'='.repeat(80)}`);
      console.log('Example Test Data Format:');
      console.log(`${'='.repeat(80)}`);
      console.log(`
// For use in tests:
const testData = {
  prompt: "${exampleEntry.prompt}",
  area: ${exampleEntry.area ? `"${exampleEntry.area}"` : 'null'},
  region: ${exampleEntry.region ? `"${exampleEntry.region}"` : 'null'},
  country: ${exampleEntry.country ? `"${exampleEntry.country}"` : 'null'},
  timeline: ${exampleEntry.timeline ? `"${exampleEntry.timeline}"` : 'null'},
  buttonClickCount: ${exampleEntry.button_click_count ? `"${exampleEntry.button_click_count}"` : 'null'}
};
      `);
    }

  } catch (error) {
    console.error('Failed to fetch query cache entries:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 20,
  onlyWithResponses: true,
  showFullResponse: false,
  saveToFile: false
};

// Simple argument parsing
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--limit':
      options.limit = parseInt(args[++i]) || 20;
      break;
    case '--all':
      options.onlyWithResponses = false;
      break;
    case '--full':
      options.showFullResponse = true;
      break;
    case '--save':
      options.saveToFile = true;
      break;
    case '--area':
      options.area = args[++i];
      break;
    case '--region':
      options.region = args[++i];
      break;
    case '--country':
      options.country = args[++i];
      break;
    case '--timeline':
      options.timeline = args[++i];
      break;
    case '--help':
      console.log(`
Usage: node fetch-query-cache-entries.js [options]

Options:
  --limit <n>        Number of entries to fetch (default: 20)
  --all              Include entries without responses
  --full             Show full response content
  --save             Save results to a JSON file
  --area <area>      Filter by area (e.g., "tampa-bay")
  --region <region>  Filter by region (e.g., "FL")
  --country <code>   Filter by country (e.g., "US")
  --timeline <time>  Filter by timeline (e.g., "today")
  --help             Show this help message

Examples:
  node fetch-query-cache-entries.js
  node fetch-query-cache-entries.js --limit 50 --save
  node fetch-query-cache-entries.js --area tampa-bay --timeline today
  node fetch-query-cache-entries.js --full --limit 5
      `);
      process.exit(0);
  }
}

// Run the script
fetchQueryCacheEntries(options);