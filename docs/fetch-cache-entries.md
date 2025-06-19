# Fetching Query Cache Entries from Supabase

This document explains how to fetch and analyze actual query cache entries from the Supabase `query_cache` table for testing purposes.

## Available Scripts

### 1. TypeScript Version (Recommended)
```bash
npm run fetch-cache-ts
```

This integrates with the existing codebase and uses the configured Supabase service.

### 2. JavaScript Version
```bash
npm run fetch-cache
```

Standalone JavaScript version that directly connects to Supabase.

## Command Line Options

Both scripts support the following options:

- `--limit <n>` - Number of entries to fetch (default: 20)
- `--all` - Include entries without responses (default: only entries with responses)
- `--full` - Show full response content (default: preview only)
- `--save` - Save results to a JSON file in test-data/
- `--area <area>` - Filter by area (e.g., "tampa-bay")
- `--region <region>` - Filter by region (e.g., "FL")
- `--country <code>` - Filter by country (e.g., "US")
- `--timeline <time>` - Filter by timeline (e.g., "today", "this week")
- `--help` - Show help message

## Usage Examples

### Basic Usage
Fetch 20 most recent cache entries with responses:
```bash
npm run fetch-cache-ts
```

### Filter by Location
Get entries for Tampa Bay area:
```bash
npm run fetch-cache-ts -- --area tampa-bay
```

### Filter by Timeline
Get entries for "today":
```bash
npm run fetch-cache-ts -- --timeline today
```

### Combined Filters
Get Tampa Bay entries for today:
```bash
npm run fetch-cache-ts -- --area tampa-bay --timeline today
```

### Save to File
Save 50 entries to a JSON file:
```bash
npm run fetch-cache-ts -- --limit 50 --save
```

### Show Full Responses
Display complete response data for 5 entries:
```bash
npm run fetch-cache-ts -- --limit 5 --full
```

## Output Format

The script provides:

1. **Sample Test Data** - Copy-paste ready examples for use in tests
2. **Detailed Cache Entries** - Full information about each entry
3. **Summary Statistics** - Breakdown by area, timeline, provider, and common prompts

### Sample Output
```javascript
// Example 1
const testData = {
  prompt: "Find upcoming events in the area",
  area: "tampa-bay",
  region: "FL",
  country: "US",
  timeline: "this week",
  buttonClickCount: null
};
```

## Understanding Cache Entries

Each cache entry contains:

- **ID**: Unique identifier
- **Query Parameters**: prompt, area, region, country, timeline, buttonClickCount
- **Model Info**: provider (e.g., "openai") and model name
- **Response**: The cached LLM response, typically with a `data` array
- **Timestamps**: created_at and expire_at

## Using Data in Tests

After running the script, you can:

1. Copy the example test data directly into your test files
2. Use the saved JSON file for bulk test data
3. Identify common query patterns for realistic testing
4. Verify that cache entries have the expected structure

## Troubleshooting

If you get no results:
- Check that your `.env` file has valid Supabase credentials
- Try using `--all` to include entries without responses
- Remove filters to see all available entries
- Check that entries haven't expired (expire_at is in the future)

## Related Scripts

- `npm run find-cache` - Find a specific cache entry by ID or prompt
- `npm run test:query-cache` - Run query cache smoke tests