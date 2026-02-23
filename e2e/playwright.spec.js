const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5175';

(async () => {
  console.log('🚀 Starting E2E test for stock search...\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 30 });
  const page = await browser.newPage();
  
  // Listen to console logs
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Error') || msg.text().includes('error')) {
      console.log('Browser error:', msg.text());
    }
  });
  
  let passed = 0;
  let failed = 0;
  
  try {
    // Test 1: Navigate
    console.log('Test 1: Navigate to Add Stock page');
    await page.goto(`${TARGET_URL}/add`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    console.log('  ✅ Page loaded');
    
    // Test 2: Check label
    console.log('\nTest 2: Verify label changed');
    const hasLabel = await page.locator('label:has-text("股票名称或代码")').isVisible();
    if (hasLabel) {
      console.log('  ✅ Label changed to "股票名称或代码"');
      passed++;
    } else {
      console.log('  ❌ Label not found');
      failed++;
    }
    
    // Test 3: Enter search term
    console.log('\nTest 3: Enter stock name and press Enter');
    const input = page.locator('input[placeholder*="输入代码或名称"]');
    await input.fill('腾讯');
    await input.press('Enter');
    console.log('  ✅ Filled "腾讯" and pressed Enter');
    
    // Test 4: Check modal opens
    console.log('\nTest 4: Verify search modal opens');
    await page.waitForTimeout(3000);
    const modal = page.locator('.modal-content:has-text("搜索股票")');
    const modalVisible = await modal.isVisible();
    if (modalVisible) {
      console.log('  ✅ Search modal opened');
      passed++;
    } else {
      console.log('  ❌ Modal not visible');
      failed++;
    }
    
    // Test 5: Click search button in modal
    console.log('\nTest 5: Click search button in modal');
    const searchInput = page.locator('input[placeholder*="输入股票名称"]');
    await searchInput.fill('腾讯');
    
    const searchBtn = page.locator('button.search-modal-btn');
    await searchBtn.click();
    console.log('  ✅ Clicked search button');
    
    // Test 6: Wait longer for results
    console.log('\nTest 6: Wait for search results (longer wait)...');
    await page.waitForTimeout(8000);
    
    const results = page.locator('.search-result-item');
    const count = await results.count();
    console.log(`  📊 Found ${count} results`);
    
    if (count > 0) {
      console.log('  ✅ Search results displayed');
      passed++;
      
      // Test 7: Select result
      console.log('\nTest 7: Select first result');
      await results.first().click();
      await page.waitForTimeout(1000);
      
      // Test 8: Verify form filled
      const modalClosed = await modal.isHidden().catch(() => true);
      if (modalClosed) {
        console.log('  ✅ Modal closed');
        passed++;
        
        const codeValue = await input.inputValue();
        if (codeValue) {
          console.log(`  ✅ Code filled: ${codeValue}`);
          passed++;
        } else {
          console.log('  ❌ Code not filled');
          failed++;
        }
      }
    } else {
      // Debug: show what's in the modal
      const modalContent = await page.locator('.modal-body').innerHTML().catch(() => 'N/A');
      console.log('  Modal content:', modalContent.substring(0, 200));
      failed++;
    }
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    failed++;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  await browser.close();
})();
