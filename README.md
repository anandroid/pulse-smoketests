# Pulse Smoke Tests

Automated smoke tests for the Pulse ecosystem APIs with self-healing capabilities.

## Features

- 🔍 **Comprehensive API Testing**: Tests all Pulse API strategies (query_cache, rag_cache, rag_vector, rag_hybrid, web_search_llm)
- 📊 **Supabase Integration**: Retrieves real cache entries for realistic testing
- ⏱️ **Performance Monitoring**: Tracks response times and validates SLAs
- 🔔 **Notifications**: Slack and Discord alerts for failures
- 🤖 **Auto-healing**: Automated issue detection and potential fixes
- 🎯 **GitHub Actions**: Scheduled runs and manual triggers

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/pulse-smoketests.git
cd pulse-smoketests
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Run tests locally:
```bash
# Run all smoke tests
npm run smoke

# Run Jest tests
npm test

# Run with watch mode
npm run test:watch
```

## Environment Variables

Required variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for Supabase
- `PULSE_API_BASE_URL`: Base URL for Pulse APIs

Optional variables:
- `TEST_AREA`: Default test area (default: tampa-bay)
- `TEST_REGION`: Default test region (default: FL)
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications
- `ENABLE_AUTO_HEALING`: Enable automatic issue resolution

## GitHub Actions

### Scheduled Tests
Tests run automatically every hour. Configure in `.github/workflows/smoke-tests.yml`.

### Manual Tests
Trigger specific tests via GitHub Actions UI with custom parameters.

### Required Secrets
Configure these in your GitHub repository settings:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PULSE_API_BASE_URL`
- `SLACK_WEBHOOK_URL` (optional)
- `DISCORD_WEBHOOK_URL` (optional)

## Test Structure

```
src/
├── config/           # Configuration management
├── services/         # API clients and integrations
├── smoke-tests/      # Main test suites
├── tests/           # Test utilities and setup
└── utils/           # Helper functions
```

## Adding New Tests

1. Create a new test file in `src/smoke-tests/`
2. Use the existing service clients from `src/services/`
3. Follow the pattern in `rag-vector.test.ts`
4. Update the main runner in `src/smoke-tests/index.ts`

## Monitoring

Test results are:
- Logged to console with Winston
- Sent to Slack/Discord on failures
- Uploaded as GitHub Actions artifacts
- Created as GitHub issues for persistent failures

## Auto-healing

When enabled, the system can:
- Restart failed services
- Clear corrupted caches
- Adjust rate limits
- Create fix PRs for common issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details