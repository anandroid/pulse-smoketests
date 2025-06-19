import { supabaseService } from '../src/services/supabase';
import logger from '../src/utils/logger';
import fs from 'fs/promises';
import path from 'path';

interface FetchOptions {
  limit?: number;
  onlyWithResponses?: boolean;
  showFullResponse?: boolean;
  saveToFile?: boolean;
  area?: string;
  region?: string;
  country?: string;
  timeline?: string;
}

async function fetchAndDisplayCacheEntries(options: FetchOptions = {}) {
  const {
    limit = 20,
    onlyWithResponses = true,
    showFullResponse = false,
    saveToFile = false,
    area,
    region,
    country,
    timeline
  } = options;

  try {
    logger.info('Fetching query cache entries from Supabase...');
    
    // Use the existing supabase service method with raw SQL for more flexibility
    const supabase = (supabaseService as any).client;
    
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
      logger.error('Error fetching data:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No cache entries found with the specified criteria.');
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

    console.log(`\nFound ${entries.length} cache entries${onlyWithResponses ? ' with responses' : ''}:\n`);

    // Display sample test data
    console.log('=' .repeat(80));
    console.log('SAMPLE TEST DATA FOR SMOKE TESTS');
    console.log('=' .repeat(80));
    console.log('\nCopy these examples to use in your tests:\n');

    // Show first 3 entries as examples
    const examples = entries.slice(0, 3);
    examples.forEach((entry, index) => {
      console.log(`// Example ${index + 1}`);
      console.log('const testData = {');
      console.log(`  prompt: "${entry.prompt}",`);
      console.log(`  area: ${entry.area ? `"${entry.area}"` : 'null'},`);
      console.log(`  region: ${entry.region ? `"${entry.region}"` : 'null'},`);
      console.log(`  country: ${entry.country ? `"${entry.country}"` : 'null'},`);
      console.log(`  timeline: ${entry.timeline ? `"${entry.timeline}"` : 'null'},`);
      console.log(`  buttonClickCount: ${entry.button_click_count ? `"${entry.button_click_count}"` : 'null'}`);
      console.log('};');
      console.log('');
    });

    // Display detailed entries
    console.log('\n' + '=' .repeat(80));
    console.log('DETAILED CACHE ENTRIES');
    console.log('=' .repeat(80));

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
        console.log(`\nResponse:`);
        const hasData = entry.response.data && Array.isArray(entry.response.data);
        const itemCount = hasData ? entry.response.data.length : 0;
        
        console.log(`  Has 'data' array: ${hasData}`);
        console.log(`  Item count: ${itemCount}`);
        
        if (hasData && itemCount > 0) {
          console.log(`  First item preview:`);
          const firstItem = entry.response.data[0];
          console.log(`    Title: ${firstItem.title || 'N/A'}`);
          console.log(`    Category: ${firstItem.category || 'N/A'}`);
          console.log(`    Description: ${(firstItem.description || '').substring(0, 100)}...`);
        }
        
        if (showFullResponse) {
          console.log(`\n  Full response:`);
          console.log(JSON.stringify(entry.response, null, 2));
        } else if (!hasData) {
          // Show preview of non-standard response structure
          const responseStr = JSON.stringify(entry.response);
          const preview = responseStr.length > 200 
            ? responseStr.substring(0, 200) + '...' 
            : responseStr;
          console.log(`  Response preview: ${preview}`);
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
      const filepath = path.join(__dirname, '..', 'test-data', filename);
      
      await fs.mkdir(path.join(__dirname, '..', 'test-data'), { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(displayData, null, 2));
      
      console.log(`\n\nData saved to: ${filepath}`);
    }

    // Show summary statistics
    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY STATISTICS');
    console.log(`${'='.repeat(80)}`);
    
    // Count by area
    const areaCounts: Record<string, number> = {};
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
    const timelineCounts: Record<string, number> = {};
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
    const providerCounts: Record<string, number> = {};
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

    // Show most common prompts
    const promptCounts: Record<string, number> = {};
    entries.forEach(entry => {
      const prompt = entry.prompt;
      promptCounts[prompt] = (promptCounts[prompt] || 0) + 1;
    });
    
    console.log('\nTop 5 Most Common Prompts:');
    Object.entries(promptCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([prompt, count], index) => {
        const truncated = prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
        console.log(`  ${index + 1}. "${truncated}" (${count} times)`);
      });

  } catch (error) {
    logger.error('Failed to fetch query cache entries:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: FetchOptions = {
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
Usage: tsx scripts/fetch-cache-data.ts [options]

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
  tsx scripts/fetch-cache-data.ts
  tsx scripts/fetch-cache-data.ts --limit 50 --save
  tsx scripts/fetch-cache-data.ts --area tampa-bay --timeline today
  tsx scripts/fetch-cache-data.ts --full --limit 5
      `);
      process.exit(0);
  }
}

// Run the script
fetchAndDisplayCacheEntries(options)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });