# Pulse Smoke Tests - Development Guidelines

## Repository Overview
This repository contains automated smoke tests for the Pulse ecosystem APIs. The tests run on a schedule and can detect issues early, with capabilities for auto-healing.

## Key Components

### 1. Supabase Integration
- Connects to the `query_cache` table to retrieve real test data
- Uses vector embeddings for similarity searches
- Handles authentication with service role keys

### 2. Pulse API Testing
- Tests all waterfall strategies: query_cache, rag_cache, rag_vector, rag_hybrid, web_search_llm
- Validates response structure and performance
- Supports location-based and category filtering

### 3. Notification System
- Slack and Discord webhook integrations
- Configurable alerts for test failures
- Detailed error reporting with context

### 4. GitHub Actions
- Hourly scheduled runs
- Manual trigger with custom parameters
- Auto-healing workflows for common issues

## Testing Strategy

### Smoke Test Flow
1. Retrieve a recent entry from Supabase query_cache
2. Use the same prompt to test against Pulse APIs
3. Validate response structure and timing
4. Check for data consistency
5. Report failures with detailed context

### Performance Expectations
- query_cache: < 500ms
- rag_cache: < 1000ms
- rag_vector: < 3000ms
- rag_hybrid: < 4000ms
- web_search_llm: < 10000ms

## Auto-healing Capabilities

When tests fail, the system can:
1. Analyze error patterns
2. Check service health endpoints
3. Clear caches if corruption detected
4. Restart services via Cloud Run API
5. Create GitHub issues for manual intervention
6. Generate fix PRs for known issues

## Environment Configuration

### Required Secrets
- Supabase credentials (URL, keys)
- Pulse API base URL
- Notification webhooks (optional)

### Test Configuration
- Configurable test location (area, region, country)
- Adjustable timeouts and retry logic
- Feature flags for notifications and auto-healing

## Development Workflow

### Adding New Tests
1. Create test file in `src/smoke-tests/`
2. Use existing service clients
3. Follow established patterns
4. Update the main test runner
5. Add performance benchmarks

### Running Locally
```bash
# Install dependencies
npm install

# Run all smoke tests
npm run smoke

# Run specific test suite
npm test -- rag-vector.test.ts

# Run with debug logging
LOG_LEVEL=debug npm run smoke
```

## Monitoring and Alerts

### Failure Detection
- API response validation
- Performance degradation
- Service availability
- Data quality checks

### Alert Channels
- Slack: Critical failures and summaries
- Discord: Detailed technical alerts
- GitHub Issues: Persistent problems
- Logs: Full diagnostic information

## Future Enhancements

1. **AI-Powered Analysis**: Use LLMs to analyze failure patterns
2. **Predictive Monitoring**: Detect issues before they impact users
3. **Cross-Region Testing**: Validate performance globally
4. **Load Testing**: Stress test during off-peak hours
5. **Data Validation**: Ensure content quality and relevance

## Maintenance

- Review test coverage monthly
- Update performance benchmarks quarterly
- Rotate test data to avoid staleness
- Monitor false positive rate
- Optimize test execution time