/**
 * Tests for computeAutoTags — 纯函数测试
 *
 * 测试从 stockData 到自动标签 ID 数组的映射逻辑，不依赖 Pinia/IndexedDB
 */
import { describe, it, expect, vi } from 'vitest'
import { computeAutoTags } from '@/stores/tagStore'
import type { StockData, TargetPriceConfig } from '@/types/stock'
import type { PRRTargetPriceConfig } from '@/types/prr'

// Mock deps needed for module-level imports in tagStore.ts
vi.mock('@/db', () => ({
  stockDB: {
    init: vi.fn(),
    getAllTags: vi.fn(),
    addTag: vi.fn(),
    putTag: vi.fn(),
    getTag: vi.fn(),
    deleteTag: vi.fn(),
    addStockTag: vi.fn(),
    getAllStockTags: vi.fn(),
    getStockTags: vi.fn(),
    getStocksByTag: vi.fn(),
    deleteStockTag: vi.fn(),
    deleteStockTagsByStockId: vi.fn(),
    deleteStockTagsByTagId: vi.fn(),
    getAllTagPools: vi.fn(),
    addTagPool: vi.fn(),
    putTagPool: vi.fn()
  }
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

function createStock(overrides: Partial<StockData> = {}): StockData {
  return {
    id: 'test-stock-1',
    name: 'Test Stock',
    code: '0001.HK',
    market: 'HK',
    marketCap: 100,
    netCash: 10,
    freeCashFlow: 5,
    netProfit: 8,
    currentRatio: null,
    peRatio: null,
    valuation1: null,
    valuation2: 0,
    yearlyData: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    baseCurrency: 'HKD',
    totalShares: null,
    targetPriceConfig: null,
    prrBase: null,
    prrAdjusted: null,
    ...overrides
  }
}

describe('computeAutoTags', () => {
  // ============ 市场标签 ============
  describe('market tags', () => {
    it('should return auto-market-hk for HK stock', () => {
      const tags = computeAutoTags(createStock({ market: 'HK' }))
      expect(tags).toContain('auto-market-hk')
      expect(tags).not.toContain('auto-market-a')
    })

    it('should return auto-market-a for A stock', () => {
      const tags = computeAutoTags(createStock({ market: 'A' }))
      expect(tags).toContain('auto-market-a')
      expect(tags).not.toContain('auto-market-hk')
    })
  })

  // ============ 估值1标签 ============
  describe('valuation1 tags', () => {
    it('should return auto-val1-low when valuation1 < 10', () => {
      const tags = computeAutoTags(createStock({ valuation1: 5 }))
      expect(tags).toContain('auto-val1-low')
      expect(tags).not.toContain('auto-val1-mid')
      expect(tags).not.toContain('auto-val1-high')
    })

    it('should return auto-val1-mid when 10 <= valuation1 < 20', () => {
      const tags = computeAutoTags(createStock({ valuation1: 15 }))
      expect(tags).toContain('auto-val1-mid')
      expect(tags).not.toContain('auto-val1-low')
      expect(tags).not.toContain('auto-val1-high')
    })

    it('should return auto-val1-high when valuation1 >= 20', () => {
      const tags = computeAutoTags(createStock({ valuation1: 25 }))
      expect(tags).toContain('auto-val1-high')
      expect(tags).not.toContain('auto-val1-low')
      expect(tags).not.toContain('auto-val1-mid')
    })

    it('should not include valuation1 tags when valuation1 is null', () => {
      const tags = computeAutoTags(createStock({ valuation1: null }))
      expect(tags).not.toContain('auto-val1-low')
      expect(tags).not.toContain('auto-val1-mid')
      expect(tags).not.toContain('auto-val1-high')
    })
  })

  // ============ 估值2标签 ============
  describe('valuation2 tags', () => {
    it('should return auto-val2-low when valuation2 < 10', () => {
      const tags = computeAutoTags(createStock({ valuation2: 5 }))
      expect(tags).toContain('auto-val2-low')
      expect(tags).not.toContain('auto-val2-mid')
      expect(tags).not.toContain('auto-val2-high')
    })

    it('should return auto-val2-mid when 10 <= valuation2 < 20', () => {
      const tags = computeAutoTags(createStock({ valuation2: 15 }))
      expect(tags).toContain('auto-val2-mid')
      expect(tags).not.toContain('auto-val2-low')
      expect(tags).not.toContain('auto-val2-high')
    })

    it('should return auto-val2-high when valuation2 >= 20', () => {
      const tags = computeAutoTags(createStock({ valuation2: 25 }))
      expect(tags).toContain('auto-val2-high')
      expect(tags).not.toContain('auto-val2-low')
      expect(tags).not.toContain('auto-val2-mid')
    })
  })

  // ============ 市赚率标签 ============
  describe('prr tags', () => {
    it('should return auto-prr-low when prr < 0.5', () => {
      const tags = computeAutoTags(createStock({ prrAdjusted: 0.3, prrSelectedFormula: 'adjusted' }))
      expect(tags).toContain('auto-prr-low')
      expect(tags).not.toContain('auto-prr-mid')
      expect(tags).not.toContain('auto-prr-high')
    })

    it('should return auto-prr-mid when 0.5 <= prr < 1.0', () => {
      const tags = computeAutoTags(createStock({ prrBase: 0.7, prrAdjusted: null }))
      expect(tags).toContain('auto-prr-mid')
      expect(tags).not.toContain('auto-prr-low')
      expect(tags).not.toContain('auto-prr-high')
    })

    it('should return auto-prr-high when prr >= 1.0', () => {
      const tags = computeAutoTags(createStock({ prrBase: 1.5, prrAdjusted: null }))
      expect(tags).toContain('auto-prr-high')
      expect(tags).not.toContain('auto-prr-low')
      expect(tags).not.toContain('auto-prr-mid')
    })

    it('should not include prr tags when no prr data', () => {
      const tags = computeAutoTags(createStock({ prrBase: null, prrAdjusted: null }))
      expect(tags).not.toContain('auto-prr-low')
      expect(tags).not.toContain('auto-prr-mid')
      expect(tags).not.toContain('auto-prr-high')
    })

    it('should prefer prrAdjusted over prrBase for PRR tag computation', () => {
      const tags = computeAutoTags(createStock({ prrBase: 1.5, prrAdjusted: 0.3, prrSelectedFormula: 'adjusted' }))
      expect(tags).toContain('auto-prr-low')
      expect(tags).not.toContain('auto-prr-high')
    })
  })

  // ============ 目标价标签（传统法） ============
  describe('target price tags (traditional method)', () => {
    function createTraditionalTargetConfig(
      overrides: Partial<TargetPriceConfig> = {}
    ): TargetPriceConfig {
      return {
        enabled: true,
        valuationType: 1,
        targetValuation: 15,
        buyTargetValuation: 10,
        sellTargetValuation: 20,
        ...overrides
      }
    }

    it('should return auto-target-buy when valuationType=1 and val1 < buy threshold', () => {
      const tags = computeAutoTags(createStock({
        valuation1: 5,
        targetPriceConfig: createTraditionalTargetConfig()
      }))
      expect(tags).toContain('auto-target-buy')
      expect(tags).not.toContain('auto-target-hold')
      expect(tags).not.toContain('auto-target-sell')
    })

    it('should return auto-target-hold when buy <= valuation < sell', () => {
      const tags = computeAutoTags(createStock({
        valuation1: 15,
        targetPriceConfig: createTraditionalTargetConfig()
      }))
      expect(tags).toContain('auto-target-hold')
      expect(tags).not.toContain('auto-target-buy')
      expect(tags).not.toContain('auto-target-sell')
    })

    it('should return auto-target-sell when valuation >= sell threshold', () => {
      const tags = computeAutoTags(createStock({
        valuation1: 25,
        targetPriceConfig: createTraditionalTargetConfig()
      }))
      expect(tags).toContain('auto-target-sell')
      expect(tags).not.toContain('auto-target-buy')
      expect(tags).not.toContain('auto-target-hold')
    })

    it('should not include target tags when targetPriceConfig is disabled', () => {
      const tags = computeAutoTags(createStock({
        valuation1: 5,
        targetPriceConfig: createTraditionalTargetConfig({ enabled: false })
      }))
      expect(tags).not.toContain('auto-target-buy')
      expect(tags).not.toContain('auto-target-hold')
      expect(tags).not.toContain('auto-target-sell')
    })

    it('should not include target tags when targetPriceConfig is null', () => {
      const tags = computeAutoTags(createStock({
        valuation1: 5,
        targetPriceConfig: null
      }))
      expect(tags).not.toContain('auto-target-buy')
      expect(tags).not.toContain('auto-target-hold')
      expect(tags).not.toContain('auto-target-sell')
    })

    it('should use valuation2 when valuationType=2', () => {
      const tags = computeAutoTags(createStock({
        valuation1: 5,
        valuation2: 25,
        targetPriceConfig: createTraditionalTargetConfig({ valuationType: 2 })
      }))
      expect(tags).toContain('auto-target-sell')
      expect(tags).not.toContain('auto-target-buy')
    })

    it('should use default thresholds when buyTargetValuation/sellTargetValuation are not set', () => {
      const tags = computeAutoTags(createStock({
        valuation1: 5,
        targetPriceConfig: {
          enabled: true,
          valuationType: 1,
          targetValuation: 15
        }
      }))
      expect(tags).toContain('auto-target-buy')
    })
  })

  // ============ 目标价标签（PRR法） ============
  describe('target price tags (PRR method)', () => {
    function createPRRStock(overrides: Partial<StockData> = {}): StockData {
      return createStock({
        prrBase: 0.5,
        targetPriceMethod: 'prr',
        targetPriceConfig: {
          enabled: true,
          valuationType: 1,
          targetValuation: 15
        },
        prrTargetPriceConfig: {
          enabled: true,
          formulaType: 'base' as const,
          targetPR: 0.8,
          buyTargetPR: 0.5,
          sellTargetPR: 1.0
        },
        ...overrides
      })
    }

    it('should return auto-target-buy when prr < buyTargetPR', () => {
      const tags = computeAutoTags(createPRRStock({ prrBase: 0.3 }))
      expect(tags).toContain('auto-target-buy')
      expect(tags).not.toContain('auto-target-hold')
      expect(tags).not.toContain('auto-target-sell')
    })

    it('should return auto-target-hold when buyTargetPR <= prr < sellTargetPR', () => {
      const tags = computeAutoTags(createPRRStock({ prrBase: 0.7 }))
      expect(tags).toContain('auto-target-hold')
      expect(tags).not.toContain('auto-target-buy')
      expect(tags).not.toContain('auto-target-sell')
    })

    it('should return auto-target-sell when prr >= sellTargetPR', () => {
      const tags = computeAutoTags(createPRRStock({ prrBase: 1.5 }))
      expect(tags).toContain('auto-target-sell')
      expect(tags).not.toContain('auto-target-buy')
      expect(tags).not.toContain('auto-target-hold')
    })

    it('should not include target tags when no PRR data', () => {
      const tags = computeAutoTags(createPRRStock({ prrBase: null, prrAdjusted: null }))
      expect(tags).not.toContain('auto-target-buy')
      expect(tags).not.toContain('auto-target-hold')
      expect(tags).not.toContain('auto-target-sell')
    })

    it('should use prrAdjusted when selected formula is adjusted', () => {
      const tags = computeAutoTags(createPRRStock({ prrBase: 1.5, prrAdjusted: 0.3, prrSelectedFormula: 'adjusted' }))
      expect(tags).toContain('auto-target-buy')
      expect(tags).not.toContain('auto-target-sell')
    })

    it('should use default buy/sell thresholds when not configured', () => {
      const tags = computeAutoTags(createStock({
        prrBase: 0.3,
        targetPriceMethod: 'prr',
        targetPriceConfig: {
          enabled: true,
          valuationType: 1,
          targetValuation: 15
        }
      }))
      expect(tags).toContain('auto-target-buy')
    })
  })

  // ============ 组合标签 ============
  describe('combined tags', () => {
    it('should return multiple tags for a fully valued stock', () => {
      const tags = computeAutoTags(createStock({
        market: 'HK',
        valuation1: 5,
        valuation2: 8,
        prrBase: 0.3,
        targetPriceConfig: {
          enabled: true,
          valuationType: 1,
          targetValuation: 15,
          buyTargetValuation: 10,
          sellTargetValuation: 20
        }
      }))
      expect(tags).toContain('auto-market-hk')
      expect(tags).toContain('auto-val1-low')
      expect(tags).toContain('auto-val2-low')
      expect(tags).toContain('auto-prr-low')
      expect(tags).toContain('auto-target-buy')
      expect(tags).toHaveLength(5)
    })

    it('should return only market and valuation2 tags for a stock with minimal data', () => {
      // valuation2 is always a number (type never null), so it always generates a tag
      const tags = computeAutoTags(createStock({
        market: 'HK',
        valuation1: null,
        valuation2: 10,
        prrBase: null,
        prrAdjusted: null,
        targetPriceConfig: null
      }))
      expect(tags).toContain('auto-market-hk')
      expect(tags).toContain('auto-val2-mid')
      expect(tags).toHaveLength(2)
    })
  })
})
