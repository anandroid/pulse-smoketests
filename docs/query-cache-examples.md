# Query Cache Examples and Structure

## Table Structure

The `query_cache` table in Supabase has the following structure:

```sql
-- Core fields
id: string                    -- Unique identifier (e.g., "xbze7k_tampa-bay_fl_us_2025-06-18")
prompt: string                -- The search query (e.g., "Show me arts things to do in Tampa Bay")
result: jsonb                 -- The search results in JSON format
area: string                  -- Geographic area (e.g., "tampa-bay", "miami", "orlando")
region: string | null         -- State/region (e.g., "FL", "CA", "NY")
country: string | null        -- Country code (e.g., "US")
timeline: string | null       -- Time filter (e.g., "today", "this week", "tonight")
button_click_count: string | null  -- Category click tracking (e.g., "1_deals", "2_events")
model: string                 -- LLM model used (e.g., "gpt-4o", "gpt-4o-mini")
prompt_embedding: vector(1536)  -- Vector embedding of the prompt
result_embedding: vector(1536)  -- Vector embedding of the result
timestamp: timestamptz        -- When the entry was created
expire_at: timestamptz        -- When the entry expires
created_at: timestamptz       -- Auto-generated creation timestamp
```

## Example Query Cache Entries

### Example 1: Arts Events in Tampa Bay
```json
{
  "id": "xbze7k_tampa-bay_fl_us_2025-06-18",
  "prompt": "Show me arts things to do in Tampa Bay",
  "area": "tampa-bay",
  "region": "FL",
  "country": "US",
  "timeline": null,
  "button_click_count": null,
  "model": "gpt-4o",
  "result": {
    "data": [
      {
        "id": "1",
        "area": "Downtown St. Petersburg",
        "city": "St. Petersburg",
        "date": "May 14 - June 30, 2025",
        "name": "The Studio@620",
        "title": "'Between Worlds' Art Exhibition",
        "category": "events",
        "description": "An exhibition featuring artists...",
        "image_url": "https://thestudioat620.org/wp-content/uploads/2025/05/Between-Worlds-650px-x-550px.jpg",
        "source": "The Studio@620",
        "source_url": "https://thestudioat620.org/event-calendar/calendar/"
      }
    ]
  }
}
```

### Example 2: Restaurant Deals Today
```json
{
  "id": "abc123_miami_fl_us_today_1_deals",
  "prompt": "restaurant deals today",
  "area": "miami",
  "region": "FL",
  "country": "US",
  "timeline": "today",
  "button_click_count": "1_deals",
  "model": "gpt-4o-mini",
  "result": {
    "data": [
      {
        "id": "1",
        "title": "50% Off Happy Hour",
        "name": "Joe's Stone Crab",
        "category": "deals",
        "discount": "50%",
        "price": "$15-25",
        "description": "Half price appetizers and drinks 4-7pm",
        "address": "11 Washington Ave, Miami Beach, FL",
        "image_url": "https://example.com/joes-happy-hour.jpg"
      }
    ]
  }
}
```

### Example 3: Tech Events This Week
```json
{
  "id": "xyz789_orlando_fl_us_this-week",
  "prompt": "tech meetups and events",
  "area": "orlando",
  "region": "FL",
  "country": "US",
  "timeline": "this week",
  "button_click_count": null,
  "model": "gpt-4o",
  "result": {
    "data": [
      {
        "id": "1",
        "title": "Orlando Tech Meetup",
        "category": "events",
        "date": "Thursday, June 20, 2025",
        "time": "6:00 PM - 8:00 PM",
        "location": "Orlando Tech Hub",
        "description": "Monthly gathering of tech professionals",
        "source": "Meetup",
        "source_url": "https://meetup.com/orlando-tech"
      }
    ]
  }
}
```

## API Request Examples

### 1. Basic Query Cache Request
```bash
curl -X POST "http://localhost:8080/api/search/query_cache" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "pizza deals today",
    "area": "tampa-bay"
  }'
```

### 2. Full Query Cache Request with All Parameters
```bash
curl -X POST "http://localhost:8080/api/search/query_cache" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "concerts this weekend",
    "area": "miami",
    "region": "FL",
    "country": "US",
    "timeline": "this weekend",
    "buttonClickCount": "1_events",
    "deviceId": "device-123",
    "enableFallbacks": true,
    "maxFallbacks": 3
  }'
```

### 3. Query Cache with Category Filter
```bash
curl -X POST "http://localhost:8080/api/search/query_cache" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "restaurant promotions",
    "area": "orlando",
    "region": "FL",
    "country": "US",
    "category": "deals",
    "buttonClickCount": "2_deals"
  }'
```

### 4. Query Cache with Session Deduplication
```bash
curl -X POST "http://localhost:8080/api/search/query_cache" \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: device-456" \
  -d '{
    "query": "live music tonight",
    "area": "tampa-bay",
    "timeline": "tonight"
  }'
```

## Response Structure

The API returns a standardized response format:

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "Event or Deal Title",
      "description": "Description of the item",
      "category": "events|deals|news|reels",
      "image_url": "https://example.com/image.jpg",
      "source": "Source Name",
      "source_url": "https://source.com/link",
      // Additional fields based on category
    }
  ],
  "source": "query_cache",
  "strategy": "query_cache",
  "timing": {
    "total_ms": 50
  },
  "meta": {
    "cache_hit": true,
    "original_count": 10,
    "flyer_count": 2,
    "total_items": 10
  },
  "timestamp": "2025-06-19T12:00:00Z"
}
```

## Common Query Patterns

1. **Location-based searches**: "events in [city]", "deals near me", "restaurants in [area]"
2. **Time-based searches**: "things to do tonight", "weekend activities", "happy hour today"
3. **Category searches**: "live music", "art exhibitions", "food specials", "tech meetups"
4. **Combined searches**: "pizza deals this weekend in Miami", "outdoor events tonight"

## Button Click Count Format

The `button_click_count` field tracks user interactions:
- `"1_deals"` - First click on "Find more deals"
- `"2_deals"` - Second click on "Find more deals"
- `"1_events"` - First click on "Find more events"
- `"3_news"` - Third click on "Find more news"

This ensures users see different results when repeatedly clicking category buttons.