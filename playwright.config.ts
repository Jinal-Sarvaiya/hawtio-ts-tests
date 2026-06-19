import { defineConfig, devices } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

// Check if storageState.json exists
const storageStatePath = path.join(__dirname, 'storageState.json')
const storageStateExists = fs.existsSync(storageStatePath)

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html'], ['list']],
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },

  use: {
    baseURL: process.env.HAWTIO_URL ?? 'http://localhost:10001/actuator/hawtio/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000, // 15 seconds for actions

    launchOptions: {
      args: [
        // Treat insecure origins as secure for Web Crypto API
        // Extract hostname and port from HAWTIO_URL
        `--unsafely-treat-insecure-origin-as-secure=${(process.env.HAWTIO_URL ?? 'http://localhost:10001/actuator/hawtio/').split('/').slice(0, 3).join('/')}`,
        // Prevents crashes in resource-constrained environments
        '--disable-dev-shm-usage',
      ],
    },
  },

  // Auto-start Hawtio application before tests (optional - set HAWTIO_APP_DIR to enable)
  // Disabled by default - start your Spring Boot or Quarkus app manually
  // webServer: process.env.HAWTIO_APP_DIR
  //   ? {
  //       command: `cd ${process.env.HAWTIO_APP_DIR} && mvn compile quarkus:dev -Ddebug=false`,
  //       url: process.env.HAWTIO_URL ?? 'http://localhost:10001/actuator/hawtio/',
  //       timeout: 120 * 1000, // 2 minutes for Maven to download dependencies and start
  //       reuseExistingServer: !process.env.CI,
  //       stdout: 'pipe',
  //       stderr: 'pipe',
  //     }
  //   : undefined,

  projects: [
    // ── Auth setup – runs once, creates storageState.json ──────────────────
    {
      name: 'setup',
      testMatch: '**/global.setup.ts',
    },

    // ── Normal parallel tests ──────────────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Only use storageState if it exists (after setup has run)
        ...(storageStateExists ? { storageState: 'storageState.json' } : {}),
      },
      dependencies: ['setup'],
      testIgnore: ['**/global.setup.ts', '**/jfr.spec.ts', '**/camel-endpoint-messaging.spec.ts'],
    },

    // ── Serial project: heavyweight / intentionally-ordered suites ─────────
    {
      name: 'serial',
      use: {
        ...devices['Desktop Chrome'],
        // Only use storageState if it exists (after setup has run)
        ...(storageStateExists ? { storageState: 'storageState.json' } : {}),
      },
      dependencies: ['setup'],
      testMatch: ['**/jfr.spec.ts', '**/camel-endpoint-messaging.spec.ts'],
      fullyParallel: false,
    },
  ],
})
