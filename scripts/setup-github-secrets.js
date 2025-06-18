#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// List of secrets to sync from Google Cloud to GitHub
const SECRETS_TO_SYNC = [
  { gcpName: 'SUPABASE_URL', githubName: 'SUPABASE_URL' },
  { gcpName: 'SUPABASE_ANON_KEY', githubName: 'SUPABASE_ANON_KEY' },
  { gcpName: 'SUPABASE_SERVICE_ROLE_SECRET', githubName: 'SUPABASE_SERVICE_ROLE_KEY' },
  { gcpName: 'OPENAI_API_KEY', githubName: 'OPENAI_API_KEY' }, // In case needed for auto-healing
];

const VARIABLES_TO_SET = [
  { name: 'PULSE_API_BASE_URL', value: 'https://pulse-apis-269146618053.us-central1.run.app' },
  { name: 'TEST_AREA', value: 'tampa-bay' },
  { name: 'TEST_REGION', value: 'FL' },
  { name: 'TEST_COUNTRY', value: 'US' },
  { name: 'TEST_TIMELINE', value: 'today' },
  { name: 'ENABLE_SLACK_NOTIFICATIONS', value: 'false' },
  { name: 'ENABLE_DISCORD_NOTIFICATIONS', value: 'false' },
  { name: 'LOG_LEVEL', value: 'info' },
];

async function getGCPSecret(secretName) {
  try {
    console.log(`📥 Fetching ${secretName} from Google Cloud...`);
    const result = execSync(
      `gcloud secrets versions access latest --secret="${secretName}"`,
      { encoding: 'utf8' }
    ).trim();
    console.log(`✅ Retrieved ${secretName}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to fetch ${secretName}:`, error.message);
    return null;
  }
}

async function setGitHubSecret(secretName, secretValue) {
  try {
    console.log(`📤 Setting GitHub secret ${secretName}...`);
    
    // GitHub CLI automatically handles encryption when setting secrets
    execSync(
      `gh secret set ${secretName} --body "${secretValue.replace(/"/g, '\\"')}"`,
      { stdio: 'inherit' }
    );
    
    console.log(`✅ Set ${secretName} in GitHub`);
  } catch (error) {
    console.error(`❌ Failed to set ${secretName}:`, error.message);
    throw error;
  }
}

async function setGitHubVariable(varName, varValue) {
  try {
    console.log(`📤 Setting GitHub variable ${varName}...`);
    
    execSync(
      `gh variable set ${varName} --body "${varValue}"`,
      { stdio: 'inherit' }
    );
    
    console.log(`✅ Set ${varName} in GitHub`);
  } catch (error) {
    console.error(`❌ Failed to set ${varName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🔐 Syncing secrets from Google Cloud to GitHub...\n');
  
  // Check if gh CLI is authenticated
  try {
    execSync('gh auth status', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ GitHub CLI is not authenticated. Please run: gh auth login');
    process.exit(1);
  }
  
  // Check if gcloud is authenticated
  try {
    execSync('gcloud auth application-default print-access-token', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Google Cloud CLI is not authenticated. Please run: gcloud auth application-default login');
    process.exit(1);
  }
  
  console.log('🔄 Syncing secrets...\n');
  
  // Sync secrets
  for (const secret of SECRETS_TO_SYNC) {
    const value = await getGCPSecret(secret.gcpName);
    if (value) {
      await setGitHubSecret(secret.githubName, value);
    }
  }
  
  console.log('\n🔄 Setting repository variables...\n');
  
  // Set variables
  for (const variable of VARIABLES_TO_SET) {
    await setGitHubVariable(variable.name, variable.value);
  }
  
  console.log('\n✅ All secrets and variables have been configured!');
  console.log('\n📋 Next steps:');
  console.log('1. Go to https://github.com/anandroid/pulse-smoketests/actions');
  console.log('2. Enable GitHub Actions if not already enabled');
  console.log('3. Run the "Manual Smoke Test" workflow to verify everything works');
  console.log('4. The scheduled tests will run automatically every hour');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});