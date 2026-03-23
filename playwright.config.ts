import { defineConfig } from '@playwright/test'

const testEnv = {
  BETTER_AUTH_SECRET: 'test-secret',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  PORT: '3002',
  POSTGRES_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
  SKIP_ENV_VALIDATION: 'true',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
}

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3002',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node ../../node_modules/next/dist/bin/next start --port 3002',
    cwd: './apps/editor',
    env: {
      ...process.env,
      ...testEnv,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://127.0.0.1:3002/api/health',
  },
})
