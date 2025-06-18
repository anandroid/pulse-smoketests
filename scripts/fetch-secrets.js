#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SECRETS = [
  { env: 'SUPABASE_URL', gcp: 'SUPABASE_URL' },
  { env: 'SUPABASE_ANON_KEY', gcp: 'SUPABASE_ANON_KEY' },
  { env: 'SUPABASE_SERVICE_ROLE_KEY', gcp: 'SUPABASE_SERVICE_ROLE_SECRET' },
  { env: 'OPENAI_API_KEY', gcp: 'OPENAI_API_KEY' },
];

function fetchSecret(secretName) {
  try {
    const result = execSync(
      `gcloud secrets versions access latest --secret="${secretName}" 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim();
    return result;
  } catch (error) {
    console.error(`Warning: Could not fetch ${secretName}`);
    return null;
  }
}

function main() {
  console.log('🔐 Fetching secrets from Google Cloud...\n');
  
  const envVars = [];
  
  // Add default values
  envVars.push('# Dynamically fetched from Google Cloud Secret Manager');
  envVars.push(`# Generated at: ${new Date().toISOString()}\n`);
  
  // Fetch secrets
  for (const secret of SECRETS) {
    const value = fetchSecret(secret.gcp);
    if (value) {
      envVars.push(`${secret.env}=${value}`);
      console.log(`✅ ${secret.env}`);
    } else {
      console.log(`❌ ${secret.env} (not found)`);
    }
  }
  
  // Add static configuration
  envVars.push('\n# Static Configuration');
  envVars.push('PULSE_API_BASE_URL=https://pulse-apis-269146618053.us-central1.run.app');
  envVars.push('TEST_AREA=tampa-bay');
  envVars.push('TEST_REGION=FL');
  envVars.push('TEST_COUNTRY=US');
  envVars.push('TEST_TIMELINE=today');
  envVars.push('ENABLE_SLACK_NOTIFICATIONS=false');
  envVars.push('ENABLE_DISCORD_NOTIFICATIONS=false');
  envVars.push('ENABLE_AUTO_HEALING=false');
  envVars.push('LOG_LEVEL=info');
  
  // Write .env file
  const envPath = path.join(__dirname, '..', '.env');
  fs.writeFileSync(envPath, envVars.join('\n'));
  
  console.log('\n✅ Secrets fetched and saved to .env file');
  console.log('🚀 You can now run: npm run smoke');
}

// Check if gcloud is available
try {
  execSync('gcloud --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Google Cloud SDK is not installed or not in PATH');
  console.error('Please install it from: https://cloud.google.com/sdk/docs/install');
  process.exit(1);
}

// Check if authenticated
try {
  execSync('gcloud auth application-default print-access-token', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Not authenticated with Google Cloud');
  console.error('Please run: gcloud auth application-default login');
  process.exit(1);
}

main();