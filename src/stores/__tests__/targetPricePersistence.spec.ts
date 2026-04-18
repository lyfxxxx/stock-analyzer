import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStockListStore } from '../stockListStore'

// Mock dependencies
vi.mock('@/db', () => ({
  stockDB: {
    init: vi.fn(),
    getAll: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

vi.mock('@/utils/targetPriceCalculator', () => ({
  calculateTargetPrice: vi.fn()
}))

function createMockStock(overrides = {}) {
  return {
    id: '1',
    name: 'TestStock',
    code: '00700',
    market: 'HK' as const,
    marketCap: 1000,
    netCash: 100,
    freeCashFlow: 50,
    netProfit: 30,
    currentRatio: null,
    peRatio: null,
    valuation1: 10,
    valuation2: 15,
    yearlyData: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    baseCurrency: 'HKD' as const,
    totalShares: 10,
    targetPriceConfig: null,
    ...overrides
  }
}

describe('targetPricePersistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('updateTargetPriceConfig', () => {
    it('should save targetPriceConfig with only persisted fields', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = createMockStock()
      const config = {
        enabled: true,
        valuationType: 1 as const,
        targetValuation: 15
      }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([{
        ...existingStock,
        targetPriceConfig: config
      }])

      const store = useStockListStore()
      await store.updateTargetPriceConfig('1', config)

      expect(stockDB.put).toHaveBeenCalled()
      const putCall = vi.mocked(stockDB.put).mock.calls[0][0]
      expect(putCall.targetPriceConfig).toEqual(config)
      expect(putCall.targetPriceConfig).not.toHaveProperty('calculatedPrice')
    })

    it('should update existing targetPriceConfig', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = createMockStock({
        targetPriceConfig: {
          enabled: true,
          valuationType: 1,
          targetValuation: 10
        }
      })
      const newConfig = {
        enabled: true,
        valuationType: 2 as const,
        targetValuation: 12
      }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([{
        ...existingStock,
        targetPriceConfig: newConfig
      }])

      const store = useStockListStore()
      await store.updateTargetPriceConfig('1', newConfig)

      expect(stockDB.put).toHaveBeenCalled()
      const putCall = vi.mocked(stockDB.put).mock.calls[0][0]
      expect(putCall.targetPriceConfig.valuationType).toBe(2)
      expect(putCall.targetPriceConfig.targetValuation).toBe(12)
    })

    it('should throw error when stock not found', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(null)

      const store = useStockListStore()
      const config = { enabled: true, valuationType: 1, targetValuation: 15 }
      await expect(store.updateTargetPriceConfig('nonexistent', config))
        .rejects.toThrow('股票不存在')
    })

    it('should reload stocks after update', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = createMockStock()
      const config = { enabled: true, valuationType: 1, targetValuation: 15 }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([{
        ...existingStock,
        targetPriceConfig: config
      }])

      const store = useStockListStore()
      await store.updateTargetPriceConfig('1', config)

      expect(stockDB.getAll).toHaveBeenCalled()
    })
  })

  describe('resetTargetPriceConfig', () => {
    it('should set targetPriceConfig to null', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = createMockStock({
        targetPriceConfig: {
          enabled: true,
          valuationType: 1,
          targetValuation: 15
        }
      })

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([{
        ...existingStock,
        targetPriceConfig: null
      }])

      const store = useStockListStore()
      await store.resetTargetPriceConfig('1')

      expect(stockDB.put).toHaveBeenCalled()
      const putCall = vi.mocked(stockDB.put).mock.calls[0][0]
      expect(putCall.targetPriceConfig).toBeNull()
    })

    it('should throw error when stock not found', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(null)

      const store = useStockListStore()
      await expect(store.resetTargetPriceConfig('nonexistent'))
        .rejects.toThrow('股票不存在')
    })

    it('should reload stocks after reset', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = createMockStock({
        targetPriceConfig: { enabled: true, valuationType: 1, targetValuation: 15 }
      })

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([{ ...existingStock, targetPriceConfig: null }])

      const store = useStockListStore()
      await store.resetTargetPriceConfig('1')

      expect(stockDB.getAll).toHaveBeenCalled()
    })
  })

  describe('getTargetPrice', () => {
    it('should return null price when stock not found', () => {
      const store = useStockListStore()
      const result = store.getTargetPrice('nonexistent')
      expect(result.price).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should return null price when config is null', () => {
      const store = useStockListStore()
      store.stocks = [createMockStock({ targetPriceConfig: null })]
      const result = store.getTargetPrice('1')
      expect(result.price).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should return null price when config.enabled is false', () => {
      const store = useStockListStore()
      store.stocks = [createMockStock({
        targetPriceConfig: { enabled: false, valuationType: 1, targetValuation: 15 }
      })]
      const result = store.getTargetPrice('1')
      expect(result.price).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should compute price for valuationType=1 (FCF)', async () => {
      const { stockDB } = await import('@/db')
      const { calculateTargetPrice } = await import('@/utils/targetPriceCalculator')
      const stock = createMockStock({
        targetPriceConfig: { enabled: true, valuationType: 1, targetValuation: 15 }
      })

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([stock])
      vi.mocked(calculateTargetPrice).mockReturnValue({ price: 15.5, error: null })

      const store = useStockListStore()
      await store.loadStocks()
      const result = store.getTargetPrice('1')

      expect(calculateTargetPrice).toHaveBeenCalledWith({
        targetValuation: 15,
        valuationType: 1,
        freeCashFlow: 50,
        netProfit: 30,
        netCash: 100,
        totalShares: 10,
        currentRatio: null
      })
      expect(result.price).toBe(15.5)
    })

    it('should compute price for valuationType=2 (Net Profit)', async () => {
      const { stockDB } = await import('@/db')
      const { calculateTargetPrice } = await import('@/utils/targetPriceCalculator')
      const stock = createMockStock({
        targetPriceConfig: { enabled: true, valuationType: 2, targetValuation: 12 }
      })

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([stock])
      vi.mocked(calculateTargetPrice).mockReturnValue({ price: 12.5, error: null })

      const store = useStockListStore()
      await store.loadStocks()
      const result = store.getTargetPrice('1')

      expect(calculateTargetPrice).toHaveBeenCalledWith({
        targetValuation: 12,
        valuationType: 2,
        freeCashFlow: 50,
        netProfit: 30,
        netCash: 100,
        totalShares: 10,
        currentRatio: null
      })
      expect(result.price).toBe(12.5)
    })

    it('should pass currentRatio to calculator when present', async () => {
      const { stockDB } = await import('@/db')
      const { calculateTargetPrice } = await import('@/utils/targetPriceCalculator')
      const stock = createMockStock({
        currentRatio: 2.0,
        targetPriceConfig: { enabled: true, valuationType: 1, targetValuation: 15 }
      })

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([stock])
      vi.mocked(calculateTargetPrice).mockReturnValue({ price: 15.5, error: null })

      const store = useStockListStore()
      await store.loadStocks()
      store.getTargetPrice('1')

      expect(calculateTargetPrice).toHaveBeenCalledWith(
        expect.objectContaining({ currentRatio: 2.0 })
      )
    })

    it('should return error from calculator', async () => {
      const { stockDB } = await import('@/db')
      const { calculateTargetPrice } = await import('@/utils/targetPriceCalculator')
      const stock = createMockStock({
        totalShares: null,
        targetPriceConfig: { enabled: true, valuationType: 1, targetValuation: 15 }
      })

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([stock])
      vi.mocked(calculateTargetPrice).mockReturnValue({ price: null, error: 'SHARES_MISSING' })

      const store = useStockListStore()
      await store.loadStocks()
      const result = store.getTargetPrice('1')

      expect(result.price).toBeNull()
      expect(result.error).toBe('SHARES_MISSING')
    })
  })

  describe('updateTotalShares', () => {
    it('should update totalShares field', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = createMockStock({ totalShares: null })

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([{
        ...existingStock,
        totalShares: 20
      }])

      const store = useStockListStore()
      await store.updateTotalShares('1', 20)

      expect(stockDB.put).toHaveBeenCalled()
      const putCall = vi.mocked(stockDB.put).mock.calls[0][0]
      expect(putCall.totalShares).toBe(20)
    })

    it('should reload stocks after update', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = createMockStock({ totalShares: null })

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([{ ...existingStock, totalShares: 20 }])

      const store = useStockListStore()
      await store.updateTotalShares('1', 20)

      expect(stockDB.getAll).toHaveBeenCalled()
    })

    it('should throw error when stock not found', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(null)

      const store = useStockListStore()
      await expect(store.updateTotalShares('nonexistent', 20))
        .rejects.toThrow('股票不存在')
    })
  })

  describe('backward compatibility', () => {
    it('should handle stocks without targetPriceConfig field', async () => {
      const { stockDB } = await import('@/db')
      const stockWithoutConfig = {
        id: '1',
        name: 'TestStock',
        code: '00700',
        market: 'HK' as const,
        marketCap: 1000,
        netCash: 100,
        freeCashFlow: 50,
        netProfit: 30,
        currentRatio: null,
        peRatio: null,
        valuation1: 10,
        valuation2: 15,
        yearlyData: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        baseCurrency: 'HKD' as const,
        totalShares: 10
        // targetPriceConfig is missing
      }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([stockWithoutConfig])

      const store = useStockListStore()
      await store.loadStocks()

      expect(store.stocks).toHaveLength(1)
      expect(store.stocks[0].targetPriceConfig).toBeNull()
    })

    it('should handle stocks with undefined targetPriceConfig', async () => {
      const { stockDB } = await import('@/db')
      const stockWithUndefinedConfig = {
        id: '1',
        name: 'TestStock',
        code: '00700',
        market: 'HK' as const,
        marketCap: 1000,
        netCash: 100,
        freeCashFlow: 50,
        netProfit: 30,
        currentRatio: null,
        peRatio: null,
        valuation1: 10,
        valuation2: 15,
        yearlyData: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        baseCurrency: 'HKD' as const,
        totalShares: 10,
        targetPriceConfig: undefined
      }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([stockWithUndefinedConfig])

      const store = useStockListStore()
      await store.loadStocks()

      expect(store.stocks).toHaveLength(1)
      expect(store.stocks[0].targetPriceConfig).toBeNull()
    })

    it('should load stocks with existing targetPriceConfig correctly', async () => {
      const { stockDB } = await import('@/db')
      const savedConfig = { enabled: true, valuationType: 2, targetValuation: 20 }
      const stockWithConfig = {
        id: '1',
        name: 'TestStock',
        code: '00700',
        market: 'HK' as const,
        marketCap: 1000,
        netCash: 100,
        freeCashFlow: 50,
        netProfit: 30,
        currentRatio: null,
        peRatio: null,
        valuation1: 10,
        valuation2: 15,
        yearlyData: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        baseCurrency: 'HKD' as const,
        totalShares: 10,
        targetPriceConfig: savedConfig
      }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([stockWithConfig])

      const store = useStockListStore()
      await store.loadStocks()

      expect(store.stocks).toHaveLength(1)
      expect(store.stocks[0].targetPriceConfig).toEqual(savedConfig)
    })
  })

  describe('persistence across reload', () => {
    it('should persist targetPriceConfig after reload via updateTargetPriceConfig', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = createMockStock()
      const config = { enabled: true, valuationType: 1, targetValuation: 15 }
      const updatedStock = { ...existingStock, targetPriceConfig: config }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      // loadStocks inside updateTargetPriceConfig calls getAll() once
      vi.mocked(stockDB.getAll).mockResolvedValue([updatedStock])

      const store = useStockListStore()
      await store.updateTargetPriceConfig('1', config)

      expect(store.stocks[0].targetPriceConfig).toEqual(config)
    })

    it('should clear targetPriceConfig after reload via resetTargetPriceConfig', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = createMockStock({
        targetPriceConfig: { enabled: true, valuationType: 1, targetValuation: 15 }
      })
      const clearedStock = { ...existingStock, targetPriceConfig: null }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      // loadStocks inside resetTargetPriceConfig calls getAll() once
      vi.mocked(stockDB.getAll).mockResolvedValue([clearedStock])

      const store = useStockListStore()
      await store.resetTargetPriceConfig('1')

      expect(store.stocks[0].targetPriceConfig).toBeNull()
    })

    it('should persist totalShares after reload via updateTotalShares', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = createMockStock({ totalShares: null })
      const updatedStock = { ...existingStock, totalShares: 50 }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      // loadStocks inside updateTotalShares calls getAll() once
      vi.mocked(stockDB.getAll).mockResolvedValue([updatedStock])

      const store = useStockListStore()
      await store.updateTotalShares('1', 50)

      expect(store.stocks[0].totalShares).toBe(50)
    })
  })
})