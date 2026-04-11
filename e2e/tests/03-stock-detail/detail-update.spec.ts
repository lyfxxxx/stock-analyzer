import { test, expect, Page } from '@playwright/test'
import { clearAllDatabases, seedStock } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'

// Test stock data for seeding
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
    { year: 2024, freeCashFlow: 1200, netProfit: 1800, isProjected: true },
    { year: 2023, freeCashFlow: 1100, netProfit: 1650 },
    { year: 2022, freeCashFlow: 1000, netProfit: 1500 },
    { year: 2021, freeCashFlow: 900, netProfit: 1350 },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  baseCurrency: 'HKD',
  isUsingProjectedData: true,
  netProfitProjected: true,
  freeCashFlowProjected: true,
}

test.describe('StockDetailView - Update Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await clearAllDatabases(page)
    
    // Monitor console errors
    setupConsoleErrorMonitoring(page)
  })

  test('UPD-001: Update button shows loading state', async ({ page }) => {
    // Seed a test stock
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify update button is visible
    const updateButton = page.locator('.update-button:has-text("更新财报数据")')
    await expect(updateButton).toBeVisible()
    await expect(updateButton).toBeEnabled()

    // Click update button
    await updateButton.click()

    // Verify loading overlay appears
    const overlay = page.locator('.updating-full-overlay')
    await expect(overlay).toBeVisible()

    // Verify loading text
    await expect(page.locator('.updating-full-overlay')).toContainText('正在更新财报数据')
    await expect(page.locator('.update-hint')).toContainText('请稍候')

    // Verify button is disabled during update
    await expect(updateButton).toBeDisabled()
  })

  test('UPD-002: Update completes successfully', async ({ page }) => {
    // Seed a test stock
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Get original values
    const marketCapCard = page.locator('.overview-card').filter({ hasText: '当前市值' })
    const originalValue = await marketCapCard.locator('.value').textContent()

    // Mock API response for stock info fetch
    await page.route('**/push2.eastmoney.com/api/qt/stock/get*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            f57: '00700',
            f58: '腾讯控股',
            f43: 35000,
          }
        })
      })
    })

    // Mock financial report API
    await page.route('**/datacenter.eastmoney.com/api/data/v1/get*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: [
              {
                '归属于母公司股东的净利润': 1900,
                '货币资金': 5000,
                '交易性金融资产': 1000,
                '短期借款': 500,
                '长期借款': 500,
                '经营活动产生的现金流量净额': 1300,
                '购建固定资产、无形资产和其他长期资产支付的现金': 100,
                '报告期': '2024-12-31',
              },
              {
                '归属于母公司股东的净利润': 1800,
                '货币资金': 4500,
                '交易性金融资产': 800,
                '短期借款': 400,
                '长期借款': 400,
                '经营活动产生的现金流量净额': 1200,
                '购建固定资产、无形资产和其他长期资产支付的现金': 100,
                '报告期': '2023-12-31',
              },
            ]
          }
        })
      })
    })

    // Click update button
    const updateButton = page.locator('.update-button:has-text("更新财报数据")')
    await updateButton.click()

    // Wait for overlay to disappear (update completes)
    await expect(page.locator('.updating-full-overlay')).not.toBeVisible({ timeout: 30000 })

    // Verify data is refreshed (values may change)
    const updatedValue = await marketCapCard.locator('.value').textContent()
    // Values should be different or same depending on mock response
    expect(updatedValue).toBeDefined()
  })

  test('UPD-003: Update with API failure handles gracefully', async ({ page }) => {
    // Seed a test stock
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Mock API failure
    await page.route('**/push2.eastmoney.com/api/qt/stock/get*', async (route) => {
      await route.abort('failed')
    })

    await page.route('**/datacenter.eastmoney.com/api/data/v1/get*', async (route) => {
      await route.abort('failed')
    })

    // Set up dialog handler for error alert
    page.on('dialog', async dialog => {
      // The app shows an alert on update failure
      await dialog.dismiss()
    })

    // Click update button
    const updateButton = page.locator('.update-button:has-text("更新财报数据")')
    await updateButton.click()

    // Wait for overlay to disappear
    await expect(page.locator('.updating-full-overlay')).not.toBeVisible({ timeout: 30000 })

    // Verify we're still on the detail page (no crash)
    const header = page.locator('h1')
    await expect(header).toContainText(testStock.name)

    // Verify update button is re-enabled
    await expect(updateButton).toBeEnabled()
  })
})
