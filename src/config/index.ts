import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Pulse API
  PULSE_API_BASE_URL: z.string().url(),
  
  // Test Configuration
  TEST_AREA: z.string().default('tampa-bay'),
  TEST_REGION: z.string().default('FL'),
  TEST_COUNTRY: z.string().default('US'),
  TEST_TIMELINE: z.string().default('today'),
  
  // Monitoring
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  
  // Timeouts
  API_TIMEOUT: z.string().transform(Number).default('30000'),
  CACHE_LOOKUP_TIMEOUT: z.string().transform(Number).default('5000'),
  
  // Feature Flags
  ENABLE_SLACK_NOTIFICATIONS: z.string().transform(v => v === 'true').default('false'),
  ENABLE_DISCORD_NOTIFICATIONS: z.string().transform(v => v === 'true').default('false'),
  ENABLE_AUTO_HEALING: z.string().transform(v => v === 'true').default('false'),
  
  // Log Level
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Failed to parse environment variables');
  }
};

export const config = parseEnv();