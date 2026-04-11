import { test, expect } from '@playwright/test'
import { clearAllDatabases } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'

test.describe('AddStockView - Excel Upload', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllDatabases(page)
    setupConsoleErrorMonitoring(page)
  })

  /**
   * XL-001: Upload zones display in manual mode
   */
  test('XL-001: Upload zones display in manual mode', async ({ page }) => {
    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Switch to manual mode
    const manualModeBtn = page.locator('.source-btn:has-text("手动模式")')
    await manualModeBtn.click()

    // Wait for manual form to load
    await page.waitForSelector('.upload-zone')

    // Verify upload zones are visible
    const uploadZones = page.locator('.upload-zone')
    await expect(uploadZones).toHaveCount(3)

    // Verify required file labels (利润表, 资产负债表, 现金流量表)
    const uploadSection = page.locator('.form-section:has-text("上传财务报表")')
    await expect(uploadSection).toBeVisible()

    // Check for file type labels in upload zones
    const uploadZoneTexts = await uploadZones.allTextContents()
    expect(uploadZoneTexts.some(t => t.includes('利润表'))).toBeTruthy()
    expect(uploadZoneTexts.some(t => t.includes('资产负债表'))).toBeTruthy()
    expect(uploadZoneTexts.some(t => t.includes('现金流量表'))).toBeTruthy()
  })

  /**
   * XL-002: Upload zone accepts file input
   */
  test('XL-002: Upload zone accepts file input', async ({ page }) => {
    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Switch to manual mode
    const manualModeBtn = page.locator('.source-btn:has-text("手动模式")')
    await manualModeBtn.click()

    // Wait for manual form to load
    await page.waitForSelector('.upload-zone')

    // Verify file input exists within upload zone
    const fileInputs = page.locator('.upload-zone input[type="file"]')
    const inputCount = await fileInputs.count()
    expect(inputCount).toBe(3)

    // Verify inputs accept correct file types
    for (let i = 0; i < inputCount; i++) {
      const acceptAttr = await fileInputs.nth(i).getAttribute('accept')
      expect(acceptAttr).toContain('.xlsx')
      expect(acceptAttr).toContain('.xls')
      expect(acceptAttr).toContain('.csv')
    }
  })

  /**
   * XL-003: Required fields validation prevents generation
   */
  test('XL-003: Required fields validation prevents generation', async ({ page }) => {
    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Switch to manual mode
    const manualModeBtn = page.locator('.source-btn:has-text("手动模式")')
    await manualModeBtn.click()

    // Wait for manual form to load
    await page.waitForSelector('.market-cap-input-group input[type="number"]')

    // Fill in code, name, market but NOT upload files
    const codeInput = page.locator('input[placeholder*="如: 00700"], input[placeholder*="如: 600519"]').first()
    await codeInput.fill('00700')

    const nameInput = page.locator('input[placeholder*="股票名称"]')
    await nameInput.fill('腾讯控股')

    // Fill market cap
    const marketCapInput = page.locator('.market-cap-input-group input[type="number"]')
    await marketCapInput.fill('34500')

    // Verify generate button is disabled or shows errors when files not uploaded
    const generateBtn = page.locator('.generate-button:has-text("生成数据")')

    // Button should be disabled or have validation errors shown
    const isDisabled = await generateBtn.isDisabled()
    if (isDisabled) {
      // Button is disabled - validation working
      await expect(generateBtn).toBeDisabled()
    } else {
      // If button is somehow enabled, check for validation summary
      const validationSummary = page.locator('.validation-summary')
      await expect(validationSummary).toBeVisible()
    }
  })
})
