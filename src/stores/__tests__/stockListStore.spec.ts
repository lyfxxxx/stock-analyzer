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

describe('stockListStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('normalizeStockData', () => {
    it('should normalize stock data with all undefined fields', () => {
      const store = useStockListStore()
      const rawStock = {
        id: '1',
        name: 'Test',
        code: '00700',
        market: 'HK' as const,
        marketCap: 1000,
        netCash: 100,
        freeCashFlow: 50,
        netProfit: 30,
        valuation1: 10,
        valuation2: 15,
        yearlyData: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        baseCurrency: 'HKD' as const
      }

      const result = store.normalizeStockData(rawStock)

      expect(result.netProfitProjected).toBe(false)
      expect(result.freeCashFlowProjected).toBe(false)
      expect(result.netCashProjected).toBe(false)
      expect(result.currentRatio).toBe(null)
      expect(result.currentRatioProjected).toBe(false)
      expect(result.peRatio).toBe(null)
      expect(result.peRatioProjected).toBe(false)
    })

    it('should use isUsingProjectedData for netProfitProjected when undefined', () => {
      const store = useStockListStore()
      const rawStock = {
        id: '1',
        name: 'Test',
        code: '00700',
        market: 'HK' as const,
        marketCap: 1000,
        netCash: 100,
        freeCashFlow: 50,
        netProfit: 30,
        valuation1: 10,
        valuation2: 15,
        yearlyData: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        baseCurrency: 'HKD' as const,
        isUsingProjectedData: true
      }

      const result = store.normalizeStockData(rawStock)

      expect(result.netProfitProjected).toBe(true)
      expect(result.freeCashFlowProjected).toBe(true)
      expect(result.netCashProjected).toBe(true)
    })

    it('should preserve existing projected flags when defined', () => {
      const store = useStockListStore()
      const rawStock = {
        id: '1',
        name: 'Test',
        code: '00700',
        market: 'HK' as const,
        marketCap: 1000,
        netCash: 100,
        freeCashFlow: 50,
        netProfit: 30,
        valuation1: 10,
        valuation2: 15,
        yearlyData: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        baseCurrency: 'HKD' as const,
        netProfitProjected: true,
        freeCashFlowProjected: false,
        netCashProjected: true,
        currentRatioProjected: true,
        peRatioProjected: false
      }

      const result = store.normalizeStockData(rawStock)

      expect(result.netProfitProjected).toBe(true)
      expect(result.freeCashFlowProjected).toBe(false)
      expect(result.netCashProjected).toBe(true)
      expect(result.currentRatioProjected).toBe(true)
      expect(result.peRatioProjected).toBe(false)
    })

    it('should preserve existing currentRatio and peRatio when defined', () => {
      const store = useStockListStore()
      const rawStock = {
        id: '1',
        name: 'Test',
        code: '00700',
        market: 'HK' as const,
        marketCap: 1000,
        netCash: 100,
        freeCashFlow: 50,
        netProfit: 30,
        valuation1: 10,
        valuation2: 15,
        yearlyData: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        baseCurrency: 'HKD' as const,
        currentRatio: 2.5,
        peRatio: 15.3
      }

      const result = store.normalizeStockData(rawStock)

      expect(result.currentRatio).toBe(2.5)
      expect(result.peRatio).toBe(15.3)
    })
  })

  describe('loadStocks', () => {
    it('should load stocks successfully', async () => {
      const { stockDB } = await import('@/db')
      const mockStocks = [
        { id: '1', name: 'Stock1', code: '00700', market: 'HK' as const, marketCap: 1000, netCash: 100, freeCashFlow: 50, netProfit: 30, valuation1: 10, valuation2: 15, yearlyData: [], createdAt: Date.now(), updatedAt: Date.now(), baseCurrency: 'HKD' as const },
        { id: '2', name: 'Stock2', code: '600000', market: 'A' as const, marketCap: 2000, netCash: 200, freeCashFlow: 100, netProfit: 60, valuation1: 20, valuation2: 25, yearlyData: [], createdAt: Date.now(), updatedAt: Date.now(), baseCurrency: 'CNY' as const }
      ]
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue(mockStocks)

      const store = useStockListStore()
      await store.loadStocks()

      expect(store.stocks).toHaveLength(2)
      expect(store.stockCount).toBe(2)
      expect(stockDB.init).toHaveBeenCalled()
      expect(stockDB.getAll).toHaveBeenCalled()
    })

    it('should handle empty stocks array', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([])

      const store = useStockListStore()
      await store.loadStocks()

      expect(store.stocks).toHaveLength(0)
      expect(store.stockCount).toBe(0)
    })

    it('should set error on DB init error', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockRejectedValue(new Error('DB init failed'))

      const store = useStockListStore()
      await store.loadStocks()

      expect(store.stocks).toHaveLength(0)
    })

    it('should set error on DB getAll error', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockRejectedValue(new Error('DB getAll failed'))

      const store = useStockListStore()
      await store.loadStocks()

      expect(store.stocks).toHaveLength(0)
    })
  })

  describe('addStock', () => {
    it('should add stock successfully', async () => {
      const { stockDB } = await import('@/db')
      const newStock = {
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
        baseCurrency: 'HKD' as const
      }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([newStock])

      const store = useStockListStore()
      await store.addStock(newStock)

      expect(stockDB.put).toHaveBeenCalledWith(newStock)
    })

    it('should throw error on DB put error', async () => {
      const { stockDB } = await import('@/db')
      const newStock = {
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
        baseCurrency: 'HKD' as const
      }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.put).mockRejectedValue(new Error('DB put failed'))

      const store = useStockListStore()
      await expect(store.addStock(newStock)).rejects.toThrow('DB put failed')
    })
  })

  describe('deleteStock', () => {
    it('should delete stock successfully', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.delete).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([])

      const store = useStockListStore()
      await store.deleteStock('1')

      expect(stockDB.delete).toHaveBeenCalledWith('1')
    })

    it('should throw error on DB delete error', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.delete).mockRejectedValue(new Error('DB delete failed'))

      const store = useStockListStore()
      await expect(store.deleteStock('1')).rejects.toThrow('DB delete failed')
    })
  })

  describe('getStockById', () => {
    it('should return stock when found', async () => {
      const { stockDB } = await import('@/db')
      const mockStock = {
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
        baseCurrency: 'HKD' as const
      }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(mockStock)

      const store = useStockListStore()
      const result = await store.getStockById('1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('1')
      expect(result?.name).toBe('TestStock')
    })

    it('should return null when stock not found', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(null)

      const store = useStockListStore()
      const result = await store.getStockById('nonexistent')

      expect(result).toBeNull()
    })

    it('should return null and log error on DB get error', async () => {
      const { stockDB } = await import('@/db')
      const { logger } = await import('@/utils/logger')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockRejectedValue(new Error('DB get failed'))

      const store = useStockListStore()
      const result = await store.getStockById('1')

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('updateStock', () => {
    it('should update stock name and marketCap successfully', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = {
        id: '1',
        name: 'OldName',
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
        baseCurrency: 'HKD' as const
      }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([{ ...existingStock, name: 'NewName', marketCap: 2000 }])

      const store = useStockListStore()
      await store.updateStock('1', { name: 'NewName', marketCap: 2000 })

      expect(stockDB.put).toHaveBeenCalled()
      const putCall = vi.mocked(stockDB.put).mock.calls[0][0]
      expect(putCall.name).toBe('NewName')
      expect(putCall.marketCap).toBe(2000)
      expect(putCall.updatedAt).toBeDefined()
    })

    it('should throw error when stock not found', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(null)

      const store = useStockListStore()
      await expect(store.updateStock('nonexistent', { name: 'NewName', marketCap: 2000 }))
        .rejects.toThrow('股票不存在')
    })

    it('should throw error on DB get error', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockRejectedValue(new Error('DB get failed'))

      const store = useStockListStore()
      await expect(store.updateStock('1', { name: 'NewName', marketCap: 2000 }))
        .rejects.toThrow('DB get failed')
    })
  })

  describe('recalculateStock', () => {
    it('should recalculate stock with new financial data successfully', async () => {
      const { stockDB } = await import('@/db')
      const existingStock = {
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
        baseCurrency: 'HKD' as const
      }

      const recalcData = {
        name: 'TestStock',
        marketCap: 2000,
        netCash: 200,
        freeCashFlow: 100,
        netProfit: 60,
        valuation1: 18,
        valuation2: 30,
        yearlyData: [{ year: 2024, freeCashFlow: 100, netProfit: 60 }]
      }

      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(existingStock)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([{ ...existingStock, ...recalcData }])

      const store = useStockListStore()
      await store.recalculateStock('1', recalcData)

      expect(stockDB.put).toHaveBeenCalled()
      const putCall = vi.mocked(stockDB.put).mock.calls[0][0]
      expect(putCall.netCash).toBe(200)
      expect(putCall.freeCashFlow).toBe(100)
      expect(putCall.netProfit).toBe(60)
      expect(putCall.valuation1).toBe(18)
      expect(putCall.valuation2).toBe(30)
      expect(putCall.yearlyData).toEqual(recalcData.yearlyData)
    })

    it('should throw error when stock not found', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(null)

      const store = useStockListStore()
      const recalcData = {
        name: 'TestStock',
        marketCap: 2000,
        netCash: 200,
        freeCashFlow: 100,
        netProfit: 60,
        valuation1: 18,
        valuation2: 30,
        yearlyData: [{ year: 2024, freeCashFlow: 100, netProfit: 60 }]
      }

      await expect(store.recalculateStock('nonexistent', recalcData))
        .rejects.toThrow('股票不存在')
    })

    it('should throw error on DB get error', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockRejectedValue(new Error('DB get failed'))

      const store = useStockListStore()
      const recalcData = {
        name: 'TestStock',
        marketCap: 2000,
        netCash: 200,
        freeCashFlow: 100,
        netProfit: 60,
        valuation1: 18,
        valuation2: 30,
        yearlyData: [{ year: 2024, freeCashFlow: 100, netProfit: 60 }]
      }

      await expect(store.recalculateStock('1', recalcData))
        .rejects.toThrow('DB get failed')
    })
  })

  describe('sortedStocks', () => {
    it('should return stocks sorted by updatedAt descending', async () => {
      const { stockDB } = await import('@/db')
      const now = Date.now()
      const mockStocks = [
        { id: '1', name: 'Stock1', code: '00700', market: 'HK' as const, marketCap: 1000, netCash: 100, freeCashFlow: 50, netProfit: 30, valuation1: 10, valuation2: 15, yearlyData: [], createdAt: now, updatedAt: now - 1000, baseCurrency: 'HKD' as const },
        { id: '2', name: 'Stock2', code: '00701', market: 'HK' as const, marketCap: 2000, netCash: 200, freeCashFlow: 100, netProfit: 60, valuation1: 20, valuation2: 25, yearlyData: [], createdAt: now, updatedAt: now, baseCurrency: 'HKD' as const },
        { id: '3', name: 'Stock3', code: '00702', market: 'HK' as const, marketCap: 3000, netCash: 300, freeCashFlow: 150, netProfit: 90, valuation1: 30, valuation2: 35, yearlyData: [], createdAt: now, updatedAt: now - 2000, baseCurrency: 'HKD' as const }
      ]
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue(mockStocks)

      const store = useStockListStore()
      await store.loadStocks()

      const sorted = store.sortedStocks
      expect(sorted[0].id).toBe('2') // Most recent
      expect(sorted[1].id).toBe('1')
      expect(sorted[2].id).toBe('3') // Oldest
    })
  })
})
