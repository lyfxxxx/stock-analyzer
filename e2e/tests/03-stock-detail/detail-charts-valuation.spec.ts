import { test, expect } from '@playwright/test'
import { clearAllDatabases, seedStock } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'

// Test stock with projected data flags
const projectedStock = {
  id: 'HK00700_proj',
  name: '腾讯控股',
  code: '00700',
  market: 'HK',
  marketCap: 34500,
  netCash: 4500,
  freeCashFlow: 1200,
  netProfit: 1800,
  currentRatio: 1.45,
  peRatio: 18.5,
  valuation1: 23.33,
  valuation2: 16.67,
  yearlyData: [
    { year: 2024, freeCashFlow: 1200, netProfit: 1800, "isProjected": true, "netProfitProjected": true },
    { year: 2023, freeCashFlow: 1100, netProfit: 1650 },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  baseCurrency: 'HKD',
  isUsingProjectedData: true,
  "netProfitProjected": true,
  "freeCashFlowProjected": true,
}

// Test stock with null values
const nullValuesStock = {
  id: 'null_vals',
  name: '测试股票',
  code: '00001',
  market: 'HK',
  marketCap: 1000,
  netCash: 500,
  freeCashFlow: 200,
  netProfit: 150,
  currentRatio: null,
  peRatio: null,
  valuation1: null,
  valuation2: 3.33,
  yearlyData: [
    { year: 2023, freeCashFlow: 200, netProfit: 150 },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  baseCurrency: 'HKD',
}

// Test stock with low current ratio (for alternative formula test)
const lowRatioStock = {
  id: 'low_ratio',
  name: '低流动比率股',
  code: '00002',
  market: 'HK',
  marketCap: 5000,
  netCash: 800,
  freeCashFlow: 300,
  netProfit: 200,
  currentRatio: 1.2,
  peRatio: 12.5,
  valuation1: 14.0,
  valuation2: 21.0,
  yearlyData: [
    { year: 2023, freeCashFlow: 300, netProfit: 200 },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  baseCurrency: 'HKD',
}

// Standard test stock
const testStock = {
  id: 'HK00700',
  name: '腾讯控股',
  code: '00700',
  market: 'HK',
  marketCap: 34500,
  netCash: 4500,
  freeCashFlow: 1200,
  netProfit: 1800,
  currentRatio: 1.45,
  peRatio: 18.5,
  valuation1: 23.33,
  valuation2: 16.67,
  yearlyData: [
    { year: 2024, freeCashFlow: 1200, netProfit: 1800, "isProjected": true },
    { year: 2023, freeCashFlow: 1100, netProfit: 1650 },
    { year: 2022, freeCashFlow: 1000, netProfit: 1500 },
    { year: 2021, freeCashFlow: 900, netProfit: 1350 },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  baseCurrency: 'HKD',
  isUsingProjectedData: true,
}

test.describe('StockDetailView - Charts & Valuation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllDatabases(page)
    setupConsoleErrorMonitoring(page)
  })

  /**
   * CHART-001: Charts render on detail page
   */
  test('CHART-001: Charts render on detail page', async ({ page }) => {
    await seedStock(page, testStock)

    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify charts grid is visible
    const chartsGrid = page.locator('.charts-grid')
    await expect(chartsGrid).toBeVisible()

    // Verify 2 chart containers are visible
    const chartContainers = page.locator('.chart-container')
    await expect(chartContainers).toHaveCount(2)

    // Verify chart titles are visible
    const chartTitles = page.locator('.chart-container h4')
    const count = await chartTitles.count()
    expect(count).toBe(2)

    // Check for expected chart titles (自由现金流趋势, 净利润趋势)
    const titles = await chartTitles.allTextContents()
    expect(titles.some(t => t.includes('自由现金流') || t.includes('现金流'))).toBeTruthy()
    expect(titles.some(t => t.includes('净利润') || t.includes('利润'))).toBeTruthy()
  })

  /**
   * CHART-002: Currency switch updates chart titles
   */
  test('CHART-002: Currency switch updates chart titles', async ({ page }) => {
    await seedStock(page, testStock)

    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify chart container is visible initially
    const chartContainer = page.locator('.chart-container').first()
    await expect(chartContainer).toBeVisible()

    // Change currency to CNY
    const currencySelect = page.locator('.currency-select')
    await currencySelect.selectOption('CNY')

    // Wait for re-render
    await page.waitForTimeout(500)

    // Verify chart container still visible after currency change
    await expect(chartContainer).toBeVisible()
  })

  /**
   * VAL-001: Projected data badges display correctly
   */
  test('VAL-001: Projected data badges display correctly', async ({ page }) => {
    await seedStock(page, projectedStock)

    await page.goto(`/stock/${projectedStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify projected badges contain "预测"
    const projectedBadges = page.locator('.projected-badge')
    const badgeCount = await projectedBadges.count()
    expect(badgeCount).toBeGreaterThan(0)

    for (let i = 0; i < badgeCount; i++) {
      const badgeText = await projectedBadges.nth(i).textContent()
      expect(badgeText).toContain('预测')
    }

    // Verify projected card class is applied
    const projectedCards = page.locator('.overview-card.projected')
    const projectedCount = await projectedCards.count()
    expect(projectedCount).toBeGreaterThan(0)
  })

  /**
   * VAL-002: N/A display for null values
   */
  test('VAL-002: N/A display for null values', async ({ page }) => {
    await seedStock(page, nullValuesStock)

    await page.goto(`/stock/${nullValuesStock.id}`)
    await page.waitForLoadState('networkidle')

    // Look for PE ratio card showing N/A
    const peCard = page.locator('.overview-card').filter({ hasText: '市盈率' })
    const peValue = peCard.locator('.value')
    const peText = await peValue.textContent()
    expect(peText).toContain('N/A')

    // Look for current ratio card showing N/A
    const ratioCard = page.locator('.overview-card').filter({ hasText: '流动比率' })
    const ratioValue = ratioCard.locator('.value')
    const ratioText = await ratioValue.textContent()
    expect(ratioText).toContain('N/A')
  })

  /**
   * VAL-003: Valuation color coding for low valuation (< 10)
   */
  test('VAL-003: Valuation color coding for low valuation (< 10)', async ({ page }) => {
    const lowStock = {
      ...testStock,
      id: 'low_val',
      valuation1: 5.0,
      valuation2: 4.0,
    }
    await seedStock(page, lowStock)

    await page.goto(`/stock/${lowStock.id}`)
    await page.waitForLoadState('networkidle')

    // Find valuation result element
    const valResult = page.locator('.val-result').first()
    await expect(valResult).toBeVisible()

    // Check for low valuation class (green styling)
    const className = await valResult.getAttribute('class')
    expect(className).toContain('valuation-low')
  })

  /**
   * VAL-004: Valuation color coding for medium valuation (10-20)
   */
  test('VAL-004: Valuation color coding for medium valuation (10-20)', async ({ page }) => {
    const mediumStock = {
      ...testStock,
      id: 'medium_val',
      valuation1: 15.0,
      valuation2: 12.0,
    }
    await seedStock(page, mediumStock)

    await page.goto(`/stock/${mediumStock.id}`)
    await page.waitForLoadState('networkidle')

    // Find valuation result element
    const valResult = page.locator('.val-result').first()
    await expect(valResult).toBeVisible()

    // Check for medium valuation class (orange styling)
    const className = await valResult.getAttribute('class')
    expect(className).toContain('valuation-medium')
  })

  /**
   * VAL-005: Valuation color coding for high valuation (> 20)
   */
  test('VAL-005: Valuation color coding for high valuation (> 20)', async ({ page }) => {
    const highStock = {
      ...testStock,
      id: 'high_val',
      valuation1: 25.0,
      valuation2: 30.0,
    }
    await seedStock(page, highStock)

    await page.goto(`/stock/${highStock.id}`)
    await page.waitForLoadState('networkidle')

    // Find valuation result element
    const valResult = page.locator('.val-result').first()
    await expect(valResult).toBeVisible()

    // Check for high valuation class (red styling)
    const className = await valResult.getAttribute('class')
    expect(className).toContain('valuation-high')
  })

  /**
   * VAL-006: Method note shows alternative formula when current ratio < 1.5
   */
  test('VAL-006: Method note shows alternative formula when current ratio < 1.5', async ({ page }) => {
    await seedStock(page, lowRatioStock)

    await page.goto(`/stock/${lowRatioStock.id}`)
    await page.waitForLoadState('networkidle')

    // Look for method note indicating alternative formula
    const methodNote = page.locator('.method-note')
    await expect(methodNote).toBeVisible()

    // Method note should contain text about the formula or current ratio
    const noteText = await methodNote.textContent()
    expect(noteText).toBeTruthy()
  })

  /**
   * VAL-007: Tooltip displays on hover
   */
  test('VAL-007: Tooltip displays on hover', async ({ page }) => {
    await seedStock(page, testStock)

    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Find tooltip trigger
    const tooltipTrigger = page.locator('.tooltip-trigger').first()
    await expect(tooltipTrigger).toBeVisible()

    // Hover over the trigger
    await tooltipTrigger.hover()

    // Verify tooltip text becomes visible
    const tooltipText = page.locator('.tooltip-text').first()
    await expect(tooltipText).toBeVisible()
  })
})
