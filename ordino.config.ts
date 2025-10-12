import { PlaywrightTestConfig, devices } from '@playwright/test';

/**
 * Ordino configuration for Playwright tests
 */
const config: PlaywrightTestConfig = {
  testDir: './ordino/e2e',
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['json', { 
      outputFile: 'ordino-report/test-results.json' 
    }],
    ['list'],
    ['allure-playwright', {
      detail: true,
      outputFolder: "ordino-report/allure-results",
      suiteTitle: false,
      environmentInfo: {
        framework: "Playwright",
        platform: process.platform,
        nodeVersion: process.version
      }
    }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://opensource-demo.orangehrmlive.com/',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Capture screenshot after each test */
    screenshot: 'only-on-failure',
    /* Report video on failure */
    video: 'on-first-retry',
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      }
    },
    {
      name: 'API Tests',
      testMatch: /.*\api\*.spec\.ts/,
    },
    //,
   /*  {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
      }, 
    },*/
  ],
  /* Run specific files in different workers */
  workers: 1,
  /* Report outputs folder */
  outputDir: 'playwright-report',
};

export default config;