import { describe, it, expect } from 'vitest'
import type { StockData } from '@/types/stock'

function getCardValuation1(stock: StockData): number | null {
  if (stock.currentRatio !== null && stock.currentRatio < 1.5) {
    if (stock.freeCashFlow <= 0) return null
    return stock.marketCap / stock.freeCashFlow
  }
  return stock.valuation1
}

function getCardValuation2(stock: StockData): number | null {
  if (stock.currentRatio !== null && stock.currentRatio < 1.5) {
    return stock.peRatio
  }
  return stock.valuation2
}

function getMetricClass(type: 'pe' | 'currentRatio', value: number | null): string {
  if (value === null) return 'na'
  if (type === 'pe') {
    if (value < 12) return 'low'
    if (value < 20) return 'medium'
    return 'high'
  }
  if (type === 'currentRatio') {
    return value >= 1.5 ? 'low' : 'medium'
  }
  return 'na'
}

function getValuationClass(value: number | null): string {
  if (value === null) return 'na'
  if (value < 0) return 'negative'
  if (value < 12) return 'low'
  if (value < 20) return 'medium'
  return 'high'
}

function createMockStock(overrides: Partial<StockData> = {}): StockData {
  return {
    id: 'test-1',
    name: '测试股票',
    code: '000001',
    market: 'A',
    marketCap: 1000,
    netCash: 200,
    freeCashFlow: 100,
    netProfit: 50,
    currentRatio: 1.5,
    peRatio: 20,
    valuation1: 8,
    valuation2: 16,
    yearlyData: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    baseCurrency: 'HKD',
    ...overrides
  }
}

describe('Card Valuation Logic', () => {
  describe('getCardValuation1', () => {
    it('should return original valuation1 when currentRatio >= 1.5', () => {
      const stock = createMockStock({ currentRatio: 1.5, valuation1: 8 })
      expect(getCardValuation1(stock)).toBe(8)
    })

    it('should return original valuation1 when currentRatio > 1.5', () => {
      const stock = createMockStock({ currentRatio: 2.0, valuation1: 10 })
      expect(getCardValuation1(stock)).toBe(10)
    })

    it('should return marketCap/freeCashFlow when currentRatio < 1.5', () => {
      const stock = createMockStock({ currentRatio: 1.2, marketCap: 1000, freeCashFlow: 100 })
      expect(getCardValuation1(stock)).toBe(10)
    })

    it('should return null when currentRatio < 1.5 and freeCashFlow is 0', () => {
      const stock = createMockStock({ currentRatio: 1.2, freeCashFlow: 0 })
      expect(getCardValuation1(stock)).toBeNull()
    })

    it('should return original valuation1 when currentRatio is null', () => {
      const stock = createMockStock({ currentRatio: null, valuation1: 8 })
      expect(getCardValuation1(stock)).toBe(8)
    })
  })

  describe('getCardValuation2', () => {
    it('should return original valuation2 when currentRatio >= 1.5', () => {
      const stock = createMockStock({ currentRatio: 1.5, valuation2: 16, peRatio: 20 })
      expect(getCardValuation2(stock)).toBe(16)
    })

    it('should return original valuation2 when currentRatio > 1.5', () => {
      const stock = createMockStock({ currentRatio: 2.0, valuation2: 12, peRatio: 15 })
      expect(getCardValuation2(stock)).toBe(12)
    })

    it('should return peRatio when currentRatio < 1.5', () => {
      const stock = createMockStock({ currentRatio: 1.2, valuation2: 16, peRatio: 20 })
      expect(getCardValuation2(stock)).toBe(20)
    })

    it('should return original valuation2 when currentRatio is null', () => {
      const stock = createMockStock({ currentRatio: null, valuation2: 16, peRatio: 20 })
      expect(getCardValuation2(stock)).toBe(16)
    })

    it('should return peRatio even when peRatio equals valuation2 for >= 1.5 case', () => {
      const stock = createMockStock({ currentRatio: 1.5, valuation2: 20, peRatio: 20 })
      expect(getCardValuation2(stock)).toBe(20)
    })
  })

  describe('getMetricClass', () => {
    describe('for PE', () => {
      it('should return low (green) when PE < 12', () => {
        expect(getMetricClass('pe', 8)).toBe('low')
        expect(getMetricClass('pe', 11.9)).toBe('low')
        expect(getMetricClass('pe', 0)).toBe('low')
      })

      it('should return medium (yellow) when PE >= 12 and < 20', () => {
        expect(getMetricClass('pe', 12)).toBe('medium')
        expect(getMetricClass('pe', 15)).toBe('medium')
        expect(getMetricClass('pe', 19.9)).toBe('medium')
      })

      it('should return high (red) when PE >= 20', () => {
        expect(getMetricClass('pe', 20)).toBe('high')
        expect(getMetricClass('pe', 25)).toBe('high')
        expect(getMetricClass('pe', 100)).toBe('high')
      })

      it('should return na when PE is null', () => {
        expect(getMetricClass('pe', null)).toBe('na')
      })
    })

    describe('for currentRatio', () => {
      it('should return low (green) when currentRatio >= 1.5', () => {
        expect(getMetricClass('currentRatio', 1.5)).toBe('low')
        expect(getMetricClass('currentRatio', 2.0)).toBe('low')
        expect(getMetricClass('currentRatio', 3.0)).toBe('low')
      })

      it('should return medium (yellow) when currentRatio < 1.5', () => {
        expect(getMetricClass('currentRatio', 1.49)).toBe('medium')
        expect(getMetricClass('currentRatio', 1.0)).toBe('medium')
        expect(getMetricClass('currentRatio', 0.5)).toBe('medium')
      })

      it('should return na when currentRatio is null', () => {
        expect(getMetricClass('currentRatio', null)).toBe('na')
      })
    })
  })

  describe('getValuationClass', () => {
    it('should return na when value is null', () => {
      expect(getValuationClass(null)).toBe('na')
    })

    it('should return negative when value < 0', () => {
      expect(getValuationClass(-5)).toBe('negative')
      expect(getValuationClass(-0.1)).toBe('negative')
    })

    it('should return low (green) when value < 12', () => {
      expect(getValuationClass(0)).toBe('low')
      expect(getValuationClass(8)).toBe('low')
      expect(getValuationClass(11.99)).toBe('low')
    })

    it('should return medium (yellow) when value >= 12 and < 20', () => {
      expect(getValuationClass(12)).toBe('medium')
      expect(getValuationClass(15)).toBe('medium')
      expect(getValuationClass(19.99)).toBe('medium')
    })

    it('should return high (red) when value >= 20', () => {
      expect(getValuationClass(20)).toBe('high')
      expect(getValuationClass(25)).toBe('high')
      expect(getValuationClass(100)).toBe('high')
    })
  })

  describe('Integration scenarios', () => {
    it('should use standard valuations for high liquidity stock (currentRatio >= 1.5)', () => {
      const stock = createMockStock({
        currentRatio: 2.0,
        marketCap: 1000,
        netCash: 200,
        freeCashFlow: 100,
        netProfit: 50,
        valuation1: 8,
        valuation2: 16,
        peRatio: 20
      })

      expect(getCardValuation1(stock)).toBe(8)
      expect(getCardValuation2(stock)).toBe(16)
    })

    it('should use marketCap-based valuations for low liquidity stock (currentRatio < 1.5)', () => {
      const stock = createMockStock({
        currentRatio: 1.2,
        marketCap: 1000,
        freeCashFlow: 100,
        netProfit: 50,
        valuation1: 8,
        valuation2: 16,
        peRatio: 20
      })

      expect(getCardValuation1(stock)).toBe(10)
      expect(getCardValuation2(stock)).toBe(20)
    })

    it('should handle boundary case currentRatio = 1.5 exactly', () => {
      const stock = createMockStock({
        currentRatio: 1.5,
        valuation1: 8,
        valuation2: 16
      })

      expect(getCardValuation1(stock)).toBe(8)
      expect(getCardValuation2(stock)).toBe(16)
    })

    it('should handle boundary case currentRatio = 1.49', () => {
      const stock = createMockStock({
        currentRatio: 1.49,
        marketCap: 1000,
        freeCashFlow: 100,
        valuation1: 8,
        valuation2: 16,
        peRatio: 20
      })

      expect(getCardValuation1(stock)).toBe(10)
      expect(getCardValuation2(stock)).toBe(20)
    })

    it('should handle negative free cash flow with currentRatio < 1.5', () => {
      const stock = createMockStock({
        currentRatio: 1.2,
        marketCap: 1000,
        freeCashFlow: -50,
        valuation1: null,
        valuation2: 16,
        peRatio: 20
      })

      expect(getCardValuation1(stock)).toBeNull()
      expect(getCardValuation2(stock)).toBe(20)
    })
  })
})