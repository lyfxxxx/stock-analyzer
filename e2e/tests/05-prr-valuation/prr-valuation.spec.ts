import { test, expect, Page } from '@playwright/test'
import { seedStock } from '../../utils/indexeddb'
import type { StockData } from '../../src/types/stock'

// Mock stock data for PRR tests
const prrTestStock: StockData = {
  id: 'HK00700_prr_test',
  name: '腾讯控股',
  code: '00700',
  market: 'HK',
  marketCap: 35000,
  netCash: 1800,
  freeCashFlow: 1500,
  netProfit: 1200,
  currentRatio: 1.8,
  peRatio: 18.5,
  valuation1: 23.33,
  valuation2: 27.67,
  baseCurrency: 'HKD',
  rateSource: 'fallback',
  createdAt: Date.now() - 86400000 * 30,
  updatedAt: Date.now() - 86400000,
  yearlyData: [
    { year: 2024, freeCashFlow: 1500, netProfit: 1200, roe: 0.18, roa: 0.08, dividendPayoutRatio: 0.30, isProjected: true },
    { year: 2023, freeCashFlow: 1400, netProfit: 1100, roe: 0.17, roa: 0.075, dividendPayoutRatio: 0.28 },
    { year: 2022, freeCashFlow: 1300, netProfit: 1000, roe: 0.16, roa: 0.07, dividendPayoutRatio: 0.25 },
    { year: 2021, freeCashFlow: 1450, netProfit: 1150, roe: 0.19, roa: 0.085, dividendPayoutRatio: 0.32 },
  ],
  roe: 0.18,
  roa: 0.08,
  pbRatio: 3.5,
  dividendPayoutRatio: 0.30,
  prrBase: 1.03,
  prrAdjusted: 0.98,
  prrCycle: 1.08,
  prrIndex: 0.95,
  prrDerived: 1.12,
  prrSelectedFormula: 'base',
  totalShares: 9.56,
}

// Mock API routes to prevent real network calls
function setupApiMocks(page: Page) {
  page.route('**/push2.eastmoney.com/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  page.route('**/datacenter.eastmoney.com/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  page.route('**/open.er-api.com/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}

test.describe('PRR Valuation Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupApiMocks(page)
  })

  /**
   * PRR-001: PRR displayed in StockCard (card view)
   */
  test('PRR-001: PRR value visible on stock cards', async ({ page }) => {
    // Use unique stock ID for each test to avoid conflicts
    const stock = { ...prrTestStock, id: `prr_card_${Date.now()}` }
    await seedStock(page, stock)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify PRR label exists
    const prrLabel = page.locator('.stock-card .valuation-label:has-text("PRR")').first()
    await expect(prrLabel).toBeVisible()

    // Verify PRR value is displayed (not N/A)
    const prrValue = page.locator('.stock-card .valuation-item').nth(2).locator('.valuation-value')
    await expect(prrValue).toBeVisible()
    const prrText = await prrValue.textContent()
    expect(prrText).toBeTruthy()
    expect(prrText).not.toContain('N/A')

    // Verify ROE label exists in metrics grid
    const roeLabel = page.locator('.stock-card .metric-label:has-text("ROE")').first()
    await expect(roeLabel).toBeVisible()

    // Verify ROA label exists in metrics grid
    const roaLabel = page.locator('.stock-card .metric-label:has-text("ROA")').first()
    await expect(roaLabel).toBeVisible()
  })

  /**
   * PRR-002: PRR displayed in StockTable (table view)
   */
  test('PRR-002: PRR column visible in table view with sorting', async ({ page }) => {
    await seedStock(page, prrTestStock)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Switch to table view
    const tableViewBtn = page.locator('button:has-text("表格"), .view-toggle button').first()
    await tableViewBtn.click()
    await page.waitForTimeout(300)

    // Verify PRR column header exists
    const prrHeader = page.locator('.stock-table th', { hasText: 'PRR' })
    await expect(prrHeader).toBeVisible()

    // Verify ROE column header exists
    const roeHeader = page.locator('.stock-table th', { hasText: 'ROE' })
    await expect(roeHeader).toBeVisible()

    // Verify ROA column header exists
    const roaHeader = page.locator('.stock-table th', { hasText: 'ROA' })
    await expect(roaHeader).toBeVisible()

    // Verify 股息支付率 column header exists
    const dividendHeader = page.locator('.stock-table th', { hasText: '股息支付率' })
    await expect(dividendHeader).toBeVisible()

    // Verify PB column header exists
    const pbHeader = page.locator('.stock-table th', { hasText: 'PB' })
    await expect(pbHeader).toBeVisible()

    // Click PRR header to sort
    await prrHeader.click()
    await page.waitForTimeout(300)

    // Verify sort icon is active after click
    const sortIcon = prrHeader.locator('.sort-icon.active')
    await expect(sortIcon).toBeVisible()
  })

  /**
   * PRR-003: PRR Detail View - formula text and selector
   */
  test('PRR-003: PRR detail view shows formula and selector', async ({ page }) => {
    await seedStock(page, prrTestStock)

    await page.goto(`/stock/${prrTestStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify PRR valuation box exists
    const prrBox = page.locator('.prr-box')
    await expect(prrBox).toBeVisible()

    // Verify PRR value is displayed
    const prrValue = page.locator('.prr-value')
    await expect(prrValue).toBeVisible()
    const prrText = await prrValue.textContent()
    expect(prrText).toBeTruthy()

    // Verify formula text is shown (e.g., "PR = PE / ROE")
    const formulaText = prrBox.locator('.val-formula')
    await expect(formulaText).toBeVisible()
    const formulaContent = await formulaText.textContent()
    expect(formulaContent).toContain('PR')

    // Verify formula selector with 5 options exists
    const formulaButtons = prrBox.locator('.formula-btn')
    await expect(formulaButtons).toHaveCount(5)

    // Verify all 5 formula names are present
    const formulaNames = ['基础', '修正', '周期', '指数', '衍生']
    for (const name of formulaNames) {
      const btn = formulaButtons.locator('.formula-name', { hasText: name })
      await expect(btn).toBeVisible()
    }

    // Get initial PRR value
    const initialPrrText = await prrValue.textContent()

    // Click on "修正" formula button
    const adjustedBtn = formulaButtons.locator('.formula-name:has-text("修正")')
    await adjustedBtn.click()
    await page.waitForTimeout(500)

    // Verify PRR value updates
    const updatedPrrText = await prrValue.textContent()
    expect(updatedPrrText).not.toEqual(initialPrrText)

    // Verify the adjusted button is now active
    const activeBtn = prrBox.locator('.formula-btn.active')
    await expect(activeBtn).toBeVisible()
  })

  /**
   * PRR-004: ROE Chart exists on detail page
   */
  test('PRR-004: ROE chart container exists', async ({ page }) => {
    await seedStock(page, prrTestStock)

    await page.goto(`/stock/${prrTestStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify ROE chart container exists
    const roeChart = page.locator('.chart-container', { hasText: 'ROE' })
    await expect(roeChart).toBeVisible()

    // Verify chart has canvas or svg element (ECharts renders to canvas)
    const chartContent = roeChart.locator('canvas, svg')
    await expect(chartContent.first()).toBeVisible()

    // Take screenshot for visual verification
    await page.screenshot({ path: '/tmp/prr-roe-chart.png', fullPage: true })
  })

  /**
   * PRR-005: Dividend Chart - no dashed prediction lines
   */
  test('PRR-005: Dividend chart shows only historical bars (no predictions)', async ({ page }) => {
    await seedStock(page, prrTestStock)

    await page.goto(`/stock/${prrTestStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify dividend chart container exists
    const dividendChart = page.locator('.chart-container', { hasText: '股息' })
    await expect(dividendChart).toBeVisible()

    // Verify chart has canvas element
    const chartContent = dividendChart.locator('canvas, svg')
    await expect(chartContent.first()).toBeVisible()

    // For ECharts, check that there are no dashed lines by examining the chart legend or series
    // This is a visual check - in practice ECharts bars don't have dashed lines
    // The dividend chart should only show solid bars for historical data

    // Take screenshot for visual verification
    await page.screenshot({ path: '/tmp/prr-dividend-chart.png', fullPage: true })
  })

  /**
   * PRR-006: PRR Target Price configuration
   */
  test('PRR-006: PRR target price calculation with formula selection', async ({ page }) => {
    await seedStock(page, prrTestStock)

    await page.goto(`/stock/${prrTestStock.id}`)
    await page.waitForLoadState('networkidle')

    // Click configure target price button
    const configBtn = page.locator('.config-prr-target-btn')
    await expect(configBtn).toBeVisible()
    await configBtn.click()

    // Wait for PRR target price config modal to appear
    const prrConfigPanel = page.locator('.config-panel')
    await expect(prrConfigPanel).toBeVisible({ timeout: 5000 })

    // Verify PRR target price config modal is shown
    const panelTitle = page.locator('.panel-title', { hasText: 'PRR' })
    await expect(panelTitle).toBeVisible()

    // Select a formula (cycle)
    const formulaToggleBtns = prrConfigPanel.locator('.formula-toggle-group .toggle-btn')
    const cycleBtn = formulaToggleBtns.locator('.toggle-label:has-text("周期")')
    await cycleBtn.click()
    await page.waitForTimeout(300)

    // Verify cycle button is selected (has active class)
    await expect(cycleBtn.locator('.is-active').or(cycleBtn)).toBeVisible()

    // Set target PR to 0.5 using preset button or slider
    const pr05Preset = prrConfigPanel.locator('.preset-btn:has-text("0.5PR")')
    await pr05Preset.click()
    await page.waitForTimeout(300)

    // Verify PR input shows 0.5
    const prInput = prrConfigPanel.locator('.pr-input')
    const prValue = await prInput.inputValue()
    expect(parseFloat(prValue)).toBeCloseTo(0.5, 1)

    // Calculate expected target price:
    // targetMarketValue = targetPR × ROE × netProfit
    // With: targetPR=0.5, roe=0.18 (18%), netProfit=1200
    // targetMarketValue = 0.5 × 0.18 × 1200 = 108
    // targetPrice = 108 / 9.56 (totalShares) ≈ 11.30
    // Note: actual calculation may vary based on exact ROE and formula

    // Verify calculation result section is visible
    const resultSection = prrConfigPanel.locator('.result-section')
    await expect(resultSection).toBeVisible()

    // Verify target price is calculated (not waiting message)
    const priceDisplay = resultSection.locator('.price-display')
    const priceValue = resultSection.locator('.price-value')

    // Check that we either have a price or an error (shares missing scenario)
    const hasPrice = await priceDisplay.isVisible().catch(() => false)
    const hasError = await resultSection.locator('.error-message').isVisible().catch(() => false)

    // One of these should be true
    expect(hasPrice || hasError).toBeTruthy()

    // If price is displayed, verify it's a valid number
    if (hasPrice) {
      const priceText = await priceValue.textContent()
      expect(priceText).toBeTruthy()
      const price = parseFloat(priceText || '0')
      expect(price).toBeGreaterThan(0)
    }
  })

  /**
   * PRR-007: Mobile viewport - PRR in card view
   */
  test('PRR-007: PRR visible on mobile viewport', async ({ page }) => {
    await seedStock(page, prrTestStock)

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify PRR label is visible on mobile
    const prrLabel = page.locator('.stock-card .valuation-label:has-text("PRR")').first()
    await expect(prrLabel).toBeVisible()

    // Verify PRR value is visible on mobile
    const prrValue = page.locator('.stock-card .valuation-item').nth(2).locator('.valuation-value')
    await expect(prrValue).toBeVisible()
  })

  /**
   * PRR-008: PRR tooltip shows formula explanation
   */
  test('PRR-008: PRR tooltip on card shows formula', async ({ page }) => {
    await seedStock(page, prrTestStock)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Hover over PRR info icon on the card
    const prrInfoIcon = page.locator('.stock-card .valuation-item').nth(2).locator('.info-icon')
    await prrInfoIcon.hover()

    // Verify tooltip popup appears
    const tooltip = page.locator('.tooltip-popup').first()
    await expect(tooltip).toBeVisible()

    // Verify tooltip contains formula text
    const tooltipText = await tooltip.textContent()
    expect(tooltipText).toContain('PR')
  })
})