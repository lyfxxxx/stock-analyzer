import { test, expect, Page } from '@playwright/test'
import { clearAllDatabases, seedStock } from '../../utils/indexeddb'

const MOCK_EXCHANGE_RATES = {
  result: 'success',
  provider: ' exchangerate-api.com',
  documentation: 'https://www.exchangerate-api.com/docs/overview',
  terms_of_use: 'https://www.exchangerate-api.com/terms-of-service',
  time_last_update_unix: 1712755200,
  time_last_update_utc: 'Fri, 12 Apr 2024 00:00:00 +0000',
  time_next_update_unix: 1712841600,
  time_next_update_utc: 'Sat, 13 Apr 2024 00:00:00 +0000',
  base_code: 'HKD',
  rates: {
    HKD: 1,
    USD: 0.1282,
    CNY: 0.9215,
  },
}

// Stock that exists in IndexedDB for duplicate testing
const EXISTING_STOCK = {
  id: 'HK00700_1704067200000',
  name: '腾讯控股',
  code: '00700',
  market: 'HK' as const,
  marketCap: 3500,
  netCash: 2820,
  freeCashFlow: 1650,
  netProfit: 1156,
  currentRatio: 1.8,
  peRatio: 22.5,
  valuation1: 0.41,
  valuation2: 0.59,
  baseCurrency: 'HKD' as const,
  isUsingProjectedData: false,
  netProfitProjected: false,
  freeCashFlowProjected: false,
  netCashProjected: false,
  currentRatioProjected: false,
  peRatioProjected: false,
  yearlyData: [],
  createdAt: 1704067200000,
  updatedAt: 1704067200000,
}

function setupAPIFailureMocks(page: Page) {
  // Mock exchange rates API to succeed
  page.route('https://open.er-api.com/v6/latest/HKD**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_EXCHANGE_RATES),
    })
  })

  // Mock EastMoney search API to fail (JSONP callback will fail)
  page.route('https://searchapi.eastmoney.com/api/suggest/get**', (route) => {
    route.abort('failed')
  })

  // Mock EastMoney stock info API to fail
  page.route('https://push2.eastmoney.com/api/qt/stock/get**', (route) => {
    route.abort('failed')
  })

  // Mock financial report APIs to fail
  page.route('https://datacenter.eastmoney.com/api/data/v1/get**', (route) => {
    route.abort('failed')
  })
}

function setupEmptySearchMock(page: Page) {
  // Mock exchange rates API
  page.route('https://open.er-api.com/v6/latest/HKD**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_EXCHANGE_RATES),
    })
  })

  // Mock EastMoney search API to return empty results
  page.route('https://searchapi.eastmoney.com/api/suggest/get**', (route) => {
    const callback = route.request().url().match(/cb=([^&]+)/)?.[1] || 'callback'
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `${callback}({"QuotationCodeTable": {"Data": []}})`,
    })
  })
}

function setupFetchErrorMock(page: Page) {
  // Mock exchange rates API
  page.route('https://open.er-api.com/v6/latest/HKD**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_EXCHANGE_RATES),
    })
  })

  // Mock EastMoney search API to succeed
  page.route('https://searchapi.eastmoney.com/api/suggest/get**', (route) => {
    const callback = route.request().url().match(/cb=([^&]+)/)?.[1] || 'callback'
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `${callback}({"QuotationCodeTable": {"Data": [{"Code": "00700", "Name": "腾讯控股", "MktNum": "116", "Classify": "HK", "JYS": "HK"}]}})`,
    })
  })

  // Mock EastMoney stock info API to succeed
  page.route('https://push2.eastmoney.com/api/qt/stock/get**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          f57: '00700',
          f58: '腾讯控股',
          f116: 3500000000000,
        },
      }),
    })
  })

  // Mock financial report API to fail
  page.route('https://datacenter.eastmoney.com/api/data/v1/get**', (route) => {
    route.abort('failed')
  })
}

test.describe('AddStockView - API Mode Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllDatabases(page)
  })

  test('API-ERR-001: API unavailable shows manual mode switch', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (
          text.includes('ERR_CONNECTION') ||
          text.includes('net::ERR') ||
          text.includes('Failed to load resource')
        ) {
          return
        }
        consoleErrors.push(text)
      }
    })

    // Setup all APIs to fail
    setupAPIFailureMocks(page)

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Enter stock code to enable search
    const codeInput = page.locator('input[placeholder*="输入代码或名称"]')
    await codeInput.fill('00700')

    // Click search button
    const searchButton = page.locator('.search-button')
    await searchButton.click()

    // Wait for fetch error to appear
    await expect(page.locator('.fetch-error')).toBeVisible({ timeout: 10000 })

    // Verify error elements
    const errorIcon = page.locator('.error-icon')
    await expect(errorIcon).toBeVisible()

    const errorTitle = page.locator('.error-title')
    await expect(errorTitle).toContainText('获取财报数据失败')

    // Verify switch to manual button is visible
    const switchButton = page.locator('.switch-btn')
    await expect(switchButton).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-ERR-002: Fetch error displays with retry option', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (
          text.includes('ERR_CONNECTION') ||
          text.includes('net::ERR') ||
          text.includes('Failed to load resource')
        ) {
          return
        }
        consoleErrors.push(text)
      }
    })

    // Setup mock where search succeeds but fetch fails
    setupFetchErrorMock(page)

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Enter stock code and open modal
    const codeInput = page.locator('input[placeholder*="输入代码或名称"]')
    await codeInput.fill('00700')
    const searchButton = page.locator('.search-button')
    await searchButton.click()

    // Wait for search results
    await page.waitForSelector('.search-result-item', { timeout: 5000 })

    // Click first result
    const firstResult = page.locator('.search-result-item').first()
    await firstResult.click()

    // Wait for error to appear
    await expect(page.locator('.fetch-error')).toBeVisible({ timeout: 10000 })

    // Verify error elements
    const errorTitle = page.locator('.error-title')
    await expect(errorTitle).toContainText('获取财报数据失败')

    // Verify retry button is visible
    const retryButton = page.locator('.retry-btn')
    await expect(retryButton).toBeVisible()
    await expect(retryButton).toContainText('重试')

    // Verify switch to manual button is visible
    const switchButton = page.locator('.switch-btn')
    await expect(switchButton).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-ERR-003: Switch to manual mode works', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (
          text.includes('ERR_CONNECTION') ||
          text.includes('net::ERR') ||
          text.includes('Failed to load resource')
        ) {
          return
        }
        consoleErrors.push(text)
      }
    })

    // Setup all APIs to fail
    setupAPIFailureMocks(page)

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Enter stock code to enable search
    const codeInput = page.locator('input[placeholder*="输入代码或名称"]')
    await codeInput.fill('00700')

    // Click search button
    const searchButton = page.locator('.search-button')
    await searchButton.click()

    // Wait for error to appear
    await expect(page.locator('.fetch-error')).toBeVisible({ timeout: 10000 })

    // Click switch to manual button
    const switchButton = page.locator('.switch-btn')
    await switchButton.click()

    // Verify manual mode is now active
    const manualModeButton = page.locator('.source-btn:has-text("手动模式")')
    await expect(manualModeButton).toHaveClass(/active/)

    // Verify manual form fields are visible
    const manualCodeInput = page.locator('.form-input[placeholder*="如: 00700"]')
    await expect(manualCodeInput).toBeVisible()

    const manualNameInput = page.locator('input[placeholder="股票名称"]')
    await expect(manualNameInput).toBeVisible()

    const manualMarketCapInput = page.locator('input[placeholder="如: 1500"]')
    await expect(manualMarketCapInput).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-ERR-004: Duplicate stock validation', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (
          text.includes('ERR_CONNECTION') ||
          text.includes('net::ERR') ||
          text.includes('Failed to load resource')
        ) {
          return
        }
        consoleErrors.push(text)
      }
    })

    // Seed existing stock in IndexedDB
    await seedStock(page, EXISTING_STOCK)

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Enter stock code that matches existing stock
    const codeInput = page.locator('input[placeholder*="输入代码或名称"]')
    await codeInput.fill('00700')

    // Click search button
    const searchButton = page.locator('.search-button')
    await searchButton.click()

    // Wait for search results
    await page.waitForSelector('.search-result-item', { timeout: 5000 })

    // Click first result (腾讯控股)
    const firstResult = page.locator('.search-result-item').first()
    await firstResult.click()

    // Wait for error message about duplicate
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.error-message')).toContainText('该股票已存在')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-ERR-005: Empty search results', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (
          text.includes('ERR_CONNECTION') ||
          text.includes('net::ERR') ||
          text.includes('Failed to load resource')
        ) {
          return
        }
        consoleErrors.push(text)
      }
    })

    // Setup mock to return empty search results
    setupEmptySearchMock(page)

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Enter stock code
    const codeInput = page.locator('input[placeholder*="输入代码或名称"]')
    await codeInput.fill('NONEXISTENT')

    // Click search button
    const searchButton = page.locator('.search-button')
    await searchButton.click()

    // Wait for empty results message
    await expect(page.locator('.search-empty')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.search-empty')).toContainText('未找到匹配的股票')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })
})
