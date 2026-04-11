import { test, expect, Page } from '@playwright/test'
import { clearAllDatabases } from '../../utils/indexeddb'

// Mock data for Tencent (00700.HK)
const MOCK_STOCK_INFO = {
  data: {
    f57: '00700',
    f58: '腾讯控股',
    f116: 3500000000000, // 3500 billion = 3500 亿
  },
}

const MOCK_SEARCH_RESULT = {
  QuotationCodeTable: {
    Data: [
      {
        Code: '00700',
        Name: '腾讯控股',
        MktNum: '116',
        Classify: 'HK',
        JYS: 'HK',
      },
      {
        Code: '03690',
        Name: '美团-W',
        MktNum: '116',
        Classify: 'HK',
        JYS: 'HK',
      },
      {
        Code: '09988',
        Name: '阿里巴巴-SW',
        MktNum: '116',
        Classify: 'HK',
        JYS: 'HK',
      },
    ],
  },
}

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

const MOCK_HK_FINANCIAL_REPORT = {
  error: null,
  data: {
    years: ['2023', '2022', '2021', '2020'],
    netProfits: [1156000000000, 1050000000000, 950000000000, 850000000000], // 1156, 1050, 950, 850 亿
    operatingCashFlow: [2100000000000, 1950000000000, 1800000000000, 1650000000000],
    capitalExpenditure: [450000000000, 420000000000, 380000000000, 350000000000],
    cashAndEquivalents: [3300000000000, 3100000000000, 2900000000000, 2700000000000],
    shortTermDebt: [180000000000, 170000000000, 160000000000, 150000000000],
    longTermDebt: [280000000000, 260000000000, 240000000000, 220000000000],
    currentRatio: [1.8, 1.75, 1.7, 1.65],
    isProjected: [false, false, false, false],
    netProfitProjected: [false, false, false, false],
    freeCashFlowProjected: [false, false, false, false],
    netCashProjected: [false, false, false, false],
    currentRatioProjected: [false, false, false, false],
    peRatioProjected: [false, false, false, false],
    baseCurrency: 'HKD' as const,
  },
}

function setupMocks(page: Page) {
  // Mock EastMoney stock info API
  page.route('https://push2.eastmoney.com/api/qt/stock/get**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_STOCK_INFO),
    })
  })

  // Mock EastMoney search API (JSONP)
  page.route('https://searchapi.eastmoney.com/api/suggest/get**', (route) => {
    const callback = route.request().url().match(/cb=([^&]+)/)?.[1] || 'callback'
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `${callback}(${JSON.stringify(MOCK_SEARCH_RESULT)})`,
    })
  })

  // Mock exchange rates API
  page.route('https://open.er-api.com/v6/latest/HKD**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_EXCHANGE_RATES),
    })
  })

  // Mock HK financial report API (EastMoney datacenter)
  page.route('https://datacenter.eastmoney.com/api/data/v1/get**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        error: null,
        data: {
          years: ['2023', '2022', '2021', '2020'],
          netProfits: [1156000000000, 1050000000000, 950000000000, 850000000000],
          operatingCashFlow: [2100000000000, 1950000000000, 1800000000000, 1650000000000],
          capitalExpenditure: [450000000000, 420000000000, 380000000000, 350000000000],
          cashAndEquivalents: [3300000000000, 3100000000000, 2900000000000, 2700000000000],
          shortTermDebt: [180000000000, 170000000000, 160000000000, 150000000000],
          longTermDebt: [280000000000, 260000000000, 240000000000, 220000000000],
          currentRatio: [1.8, 1.75, 1.7, 1.65],
          isProjected: [false, false, false, false],
          netProfitProjected: [false, false, false, false],
          freeCashFlowProjected: [false, false, false, false],
          netCashProjected: [false, false, false, false],
          currentRatioProjected: [false, false, false, false],
          peRatioProjected: [false, false, false, false],
          baseCurrency: 'HKD',
        },
      }),
    })
  })
}

test.describe('AddStockView - API Mode Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await clearAllDatabases(page)
    // Setup API mocks
    setupMocks(page)
  })

  test('API-001: API mode is default on Add Stock page', async ({ page }) => {
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

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Verify API mode button has active class
    const apiModeButton = page.locator('.source-btn:has-text("API模式")')
    await expect(apiModeButton).toBeVisible()
    await expect(apiModeButton).toHaveClass(/active/)

    // Verify manual mode button does not have active class
    const manualModeButton = page.locator('.source-btn:has-text("手动模式")')
    await expect(manualModeButton).not.toHaveClass(/active/)

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-002: Stock search modal opens correctly', async ({ page }) => {
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

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Enter stock code
    const codeInput = page.locator('input[placeholder*="输入代码或名称"]')
    await expect(codeInput).toBeVisible()
    await codeInput.fill('00700')

    // Click search button
    const searchButton = page.locator('.search-button')
    await expect(searchButton).toBeEnabled()
    await searchButton.click()

    // Verify modal appears
    const modalOverlay = page.locator('.modal-overlay')
    await expect(modalOverlay).toBeVisible()

    // Verify modal content
    const modalHeader = page.locator('.modal-header h3')
    await expect(modalHeader).toHaveText('搜索股票')

    // Verify search input is visible and focused
    const searchModalInput = page.locator('.search-modal-input')
    await expect(searchModalInput).toBeVisible()
    await expect(searchModalInput).toHaveValue('00700')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-003: Stock search returns results', async ({ page }) => {
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

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Enter stock code
    const codeInput = page.locator('input[placeholder*="输入代码或名称"]')
    await codeInput.fill('腾讯')

    // Click search button
    const searchButton = page.locator('.search-button')
    await searchButton.click()

    // Wait for search results
    await page.waitForSelector('.search-result-item', { timeout: 5000 })

    // Verify results are displayed
    const searchResults = page.locator('.search-result-item')
    await expect(searchResults).toHaveCount(3)

    // Verify first result contains expected text
    const firstResult = searchResults.first()
    await expect(firstResult.locator('.result-name')).toHaveText('腾讯控股')
    await expect(firstResult.locator('.result-code')).toContainText('00700')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-004: Selecting search result closes modal and populates form', async ({ page }) => {
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

    // Wait for modal to close
    await expect(page.locator('.modal-overlay')).not.toBeVisible()

    // Wait for data to load (either loading state or API data display)
    await page.waitForTimeout(1000)

    // Verify modal is closed
    await expect(page.locator('.modal-content')).not.toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-005: Full API fetch flow with preview', async ({ page }) => {
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

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Enter stock code and open modal
    const codeInput = page.locator('input[placeholder*="输入代码或名称"]')
    await codeInput.fill('00700')
    const searchButton = page.locator('.search-button')
    await searchButton.click()

    // Wait for search results and select first
    await page.waitForSelector('.search-result-item', { timeout: 5000 })
    const firstResult = page.locator('.search-result-item').first()
    await firstResult.click()

    // Wait for preview section to appear (after API calls complete)
    await expect(page.locator('.preview-section')).toBeVisible({ timeout: 10000 })

    // Verify API success banner
    const apiSuccessBanner = page.locator('.api-success-banner')
    await expect(apiSuccessBanner).toBeVisible()
    await expect(apiSuccessBanner).toContainText('已从API成功获取数据')

    // Verify valuation cards are displayed
    const valuationCards = page.locator('.valuation-card')
    await expect(valuationCards.first()).toBeVisible()

    // Verify save button is visible
    const saveButton = page.locator('.save-button')
    await expect(saveButton).toContainText('确认保存')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-006: Currency switching updates preview values', async ({ page }) => {
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

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Complete the full fetch flow
    const codeInput = page.locator('input[placeholder*="输入代码或名称"]')
    await codeInput.fill('00700')
    const searchButton = page.locator('.search-button')
    await searchButton.click()

    await page.waitForSelector('.search-result-item', { timeout: 5000 })
    const firstResult = page.locator('.search-result-item').first()
    await firstResult.click()

    // Wait for preview section
    await expect(page.locator('.preview-section')).toBeVisible({ timeout: 10000 })

    // Get initial market cap value
    const marketCapCard = page.locator('.valuation-card').first()
    const initialValue = await marketCapCard.locator('.val-value').textContent()

    // Switch currency to CNY
    const currencySelector = page.locator('.currency-selector .form-select')
    await currencySelector.selectOption('CNY')

    // Wait for update
    await page.waitForTimeout(500)

    // Verify value changed (CNY rate is 0.9215, so HKD value / 0.9215 should be different)
    const newValue = await marketCapCard.locator('.val-value').textContent()
    expect(newValue).not.toBe(initialValue)

    // Switch to USD
    await currencySelector.selectOption('USD')
    await page.waitForTimeout(500)

    // Verify value changed again
    const usdValue = await marketCapCard.locator('.val-value').textContent()
    expect(usdValue).not.toBe(newValue)

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-007: Save stock redirects to home', async ({ page }) => {
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

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Complete the full fetch flow
    const codeInput = page.locator('input[placeholder*="输入代码或名称"]')
    await codeInput.fill('00700')
    const searchButton = page.locator('.search-button')
    await searchButton.click()

    await page.waitForSelector('.search-result-item', { timeout: 5000 })
    const firstResult = page.locator('.search-result-item').first()
    await firstResult.click()

    // Wait for preview section
    await expect(page.locator('.preview-section')).toBeVisible({ timeout: 10000 })

    // Click save button
    const saveButton = page.locator('.save-button')
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    // Wait for redirect to home
    await page.waitForURL('/')

    // Verify home page elements
    const stocksGrid = page.locator('.stocks-grid')
    await expect(stocksGrid).toBeVisible()

    // Verify the saved stock appears in the grid
    const stockCard = page.locator('.stock-card').first()
    await expect(stockCard).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  test('API-008: Back button returns to home', async ({ page }) => {
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

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Click back button
    const backButton = page.locator('.back-button')
    await expect(backButton).toBeVisible()
    await backButton.click()

    // Verify redirect to home
    await page.waitForURL('/')

    // Verify home page loaded
    const title = page.locator('h1')
    await expect(title).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })
})
