#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findEntries() {
  console.log('Checking query_cache table structure...\n');
  
  const { data, error } = await supabase
    .from('query_cache')
    .select('*')
    .gte('expire_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Total entries found:', data.length);
  console.log('\nAnalyzing entries:\n');
  
  const validEntries = [];
  
  data.forEach((entry, i) => {
    console.log(`===== Entry ${i+1}: ${entry.id} =====`);
    console.log(`Prompt: "${entry.prompt}"`);
    console.log(`Location: ${entry.area}, ${entry.region || 'null'}, ${entry.country || 'null'}`);
    console.log(`Timeline: ${entry.timeline || 'null'}`);
    console.log(`Button Click: ${entry.button_click_count || 'null'}`);
    
    // Check response structure
    let hasValidData = false;
    let itemCount = 0;
    
    if (entry.response) {
      console.log(`Has response field: YES (type: ${typeof entry.response})`);
      if (entry.response.data && Array.isArray(entry.response.data)) {
        itemCount = entry.response.data.length;
        hasValidData = itemCount > 0;
        console.log(`  - response.data is array with ${itemCount} items`);
        if (itemCount > 0) {
          console.log(`  - First item: ${JSON.stringify(entry.response.data[0]).substring(0, 100)}...`);
        }
      }
    } else {
      console.log(`Has response field: NO`);
    }
    
    if (entry.result) {
      console.log(`Has result field: YES (type: ${typeof entry.result})`);
      if (!hasValidData) {
        // Try to parse result if response doesn't have data
        if (typeof entry.result === 'string') {
          try {
            const parsed = JSON.parse(entry.result);
            if (Array.isArray(parsed)) {
              itemCount = parsed.length;
              hasValidData = itemCount > 0;
              console.log(`  - Parsed result is array with ${itemCount} items`);
            }
          } catch {
            console.log(`  - Result is not valid JSON`);
          }
        } else if (Array.isArray(entry.result)) {
          itemCount = entry.result.length;
          hasValidData = itemCount > 0;
          console.log(`  - result is array with ${itemCount} items`);
        }
      }
    } else {
      console.log(`Has result field: NO`);
    }
    
    if (hasValidData) {
      console.log(`\n✅ VALID ENTRY FOR TESTING!`);
      console.log(`Copy this for your test:`);
      console.log(`{
  query: "${entry.prompt}",
  area: "${entry.area}",
  region: ${entry.region ? `"${entry.region}"` : 'null'},
  country: ${entry.country ? `"${entry.country}"` : 'null'},
  timeline: ${entry.timeline ? `"${entry.timeline}"` : 'null'},
  buttonClickCount: ${entry.button_click_count ? `"${entry.button_click_count}"` : 'null'}
}`);
      
      validEntries.push(entry);
    }
    
    console.log('\n');
  });
  
  console.log('='.repeat(80));
  console.log(`SUMMARY: Found ${validEntries.length} valid entries out of ${data.length} total`);
  
  if (validEntries.length > 0) {
    console.log('\nBest entry for testing:');
    const best = validEntries[0];
    console.log(`Prompt: "${best.prompt}"`);
    console.log(`Area: ${best.area}`);
    console.log(`Full test request:`);
    console.log(JSON.stringify({
      query: best.prompt,
      area: best.area,
      region: best.region,
      country: best.country,
      timeline: best.timeline,
      buttonClickCount: best.button_click_count
    }, null, 2));
  }
}

findEntries().catch(console.error);