import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStockStore, useStockListStore, useStockApiStore, useStockUIStore } from '../stockStore'

// Mock dependencies
vi.mock('@/db', () => ({
  stockDB: {
    init: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/api/eastmoney', () => ({
  fetchEastMoneyStockInfo: vi.fn(),
  testEastMoneyAPI: vi.fn().mockResolvedValue({ source: 'eastmoney', status: 'success', message: 'OK' }),
  searchStocksByName: vi.fn().mockResolvedValue([])
}))

vi.mock('@/api/tencent', () => ({
  testTencentAPI: vi.fn().mockResolvedValue({ source: 'tencent', status: 'success', message: 'OK' }),
  fetchTencentHKFinancialReport: vi.fn()
}))

vi.mock('@/api/financialReportA', () => ({
  fetchAStockFinancialReport: vi.fn()
}))

vi.mock('@/api/financialReportHK', () => ({
  fetchHKStockFinancialReport: vi.fn()
}))

vi.mock('@/utils/calculator', () => ({
  calculateNetCash: vi.fn().mockReturnValue(1000),
  calculateFreeCashFlow: vi.fn().mockReturnValue(500),
  calculateValuations: vi.fn().mockReturnValue({ valuation1: 10, valuation2: 15 }),
  calculatePERatio: vi.fn().mockReturnValue(20)
}))

vi.mock('@/utils/excelParser', () => ({
  buildYearlyData: vi.fn().mockReturnValue([])
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

describe('stockStore facade', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('state delegation from list store', () => {
    it('should expose stocks from list store', async () => {
      const { stockDB } = await import('@/db')
      const mockStocks = [
        { id: '1', name: 'Stock1', code: '00700', market: 'HK' as const, marketCap: 1000, netCash: 100, freeCashFlow: 50, netProfit: 30, valuation1: 10, valuation2: 15, yearlyData: [], createdAt: Date.now(), updatedAt: Date.now(), baseCurrency: 'HKD' as const }
      ]
      vi.mocked(stockDB.getAll).mockResolvedValue(mockStocks)

      const store = useStockStore()
      await store.loadStocks()

      expect(store.stocks).toBeDefined()
      expect(Array.isArray(store.stocks)).toBe(true)
    })

    it('should expose sortedStocks from list store', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.getAll).mockResolvedValue([])

      const store = useStockStore()
      await store.loadStocks()

      expect(store.sortedStocks).toBeDefined()
    })

    it('should expose stockCount from list store', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.getAll).mockResolvedValue([])

      const store = useStockStore()
      await store.loadStocks()

      expect(store.stockCount).toBeDefined()
      expect(typeof store.stockCount).toBe('number')
    })
  })

  describe('state delegation from UI store', () => {
    it('should expose loading from UI store', () => {
      const store = useStockStore()
      expect(store.loading).toBeDefined()
      expect(typeof store.loading).toBe('boolean')
    })

    it('should expose error from UI store', () => {
      const store = useStockStore()
      expect(store.error).toBeDefined()
    })

    it('should expose apiTestResults from UI store', () => {
      const store = useStockStore()
      expect(store.apiTestResults).toBeDefined()
      expect(Array.isArray(store.apiTestResults)).toBe(true)
    })

    it('should expose isApiAvailable from UI store', () => {
      const store = useStockStore()
      expect(store.isApiAvailable).toBeDefined()
      expect(typeof store.isApiAvailable).toBe('boolean')
    })

    it('should expose searchResults from UI store', () => {
      const store = useStockStore()
      expect(store.searchResults).toBeDefined()
      expect(Array.isArray(store.searchResults)).toBe(true)
    })

    it('should expose isSearching from UI store', () => {
      const store = useStockStore()
      expect(store.isSearching).toBeDefined()
      expect(typeof store.isSearching).toBe('boolean')
    })

    it('should expose updateProgress from UI store', () => {
      const store = useStockStore()
      expect(store.updateProgress).toBeDefined()
      expect(store.updateProgress).toHaveProperty('updated')
      expect(store.updateProgress).toHaveProperty('total')
    })

    it('should expose isUpdatingAllStocks from UI store', () => {
      const store = useStockStore()
      expect(store.isUpdatingAllStocks).toBeDefined()
      expect(typeof store.isUpdatingAllStocks).toBe('boolean')
    })

    it('should expose currentlyUpdatingIds from UI store', () => {
      const store = useStockStore()
      expect(store.currentlyUpdatingIds).toBeDefined()
      expect(store.currentlyUpdatingIds instanceof Set).toBe(true)
    })
  })

  describe('actions delegation from list store', () => {
    it('should delegate loadStocks to list store', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.getAll).mockResolvedValue([])

      const store = useStockStore()
      await store.loadStocks()

      expect(stockDB.init).toHaveBeenCalled()
      expect(stockDB.getAll).toHaveBeenCalled()
    })

    it('should delegate addStock to list store', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.put).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([])

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

      const store = useStockStore()
      await store.addStock(newStock)

      expect(stockDB.put).toHaveBeenCalled()
    })

    it('should delegate deleteStock to list store', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.delete).mockResolvedValue(undefined)
      vi.mocked(stockDB.getAll).mockResolvedValue([])

      const store = useStockStore()
      await store.deleteStock('1')

      expect(stockDB.delete).toHaveBeenCalledWith('1')
    })

    it('should delegate getStockById to list store', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(null)

      const store = useStockStore()
      const result = await store.getStockById('nonexistent')

      expect(result).toBeNull()
    })

    it('should delegate updateStock to list store', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(null)

      const store = useStockStore()
      await expect(store.updateStock('1', { name: 'New', marketCap: 1000 }))
        .rejects.toThrow()
    })

    it('should delegate recalculateStock to list store', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.init).mockResolvedValue(undefined)
      vi.mocked(stockDB.get).mockResolvedValue(null)

      const store = useStockStore()
      const recalcData = {
        name: 'Test',
        marketCap: 1000,
        netCash: 100,
        freeCashFlow: 50,
        netProfit: 30,
        valuation1: 10,
        valuation2: 15,
        yearlyData: []
      }
      await expect(store.recalculateStock('1', recalcData)).rejects.toThrow()
    })
  })

  describe('actions delegation from API store', () => {
    it('should delegate testAPIs to API store', async () => {
      const store = useStockStore()
      await store.testAPIs()

      // Should complete without throwing
      expect(true).toBe(true)
    })

    it('should delegate fetchStockInfo to API store', async () => {
      const { fetchEastMoneyStockInfo } = await import('@/api/eastmoney')
      vi.mocked(fetchEastMoneyStockInfo).mockResolvedValue(null)

      const store = useStockStore()
      await expect(store.fetchStockInfo('00700', 'HK')).rejects.toThrow()
    })

    it('should delegate fetchFinancialReport to API store', async () => {
      const { fetchHKStockFinancialReport } = await import('@/api/financialReportHK')
      vi.mocked(fetchHKStockFinancialReport).mockResolvedValue({ error: null, data: null })

      const store = useStockStore()
      await expect(store.fetchFinancialReport('00700', 'HK', 1000)).rejects.toThrow()
    })

    it('should delegate updateStockMarketCap to API store', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.get).mockResolvedValue(null)

      const store = useStockStore()
      await expect(store.updateStockMarketCap('nonexistent')).rejects.toThrow('股票不存在')
    })

    it('should delegate searchStocks to API store', async () => {
      const { searchStocksByName } = await import('@/api/eastmoney')
      vi.mocked(searchStocksByName).mockResolvedValue([])

      const store = useStockStore()
      await store.searchStocks('test')

      expect(searchStocksByName).toHaveBeenCalled()
    })
  })

  describe('actions delegation from UI store', () => {
    it('should delegate clearError to UI store', () => {
      const store = useStockStore()
      store.clearError()

      expect(store.error).toBeNull()
    })

    it('should delegate clearSearchResults to UI store', () => {
      const store = useStockStore()
      store.clearSearchResults()

      expect(store.searchResults).toEqual([])
    })
  })

  describe('updateAllStocks', () => {
    it('should return correct count for empty array', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const store = useStockStore()

      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.getAll).mockResolvedValue([])

      await store.loadStocks()
      const result = await store.updateAllStocks([])

      expect(result.success).toBe(0)
      expect(result.failed).toBe(0)
    })

    it('should reset loading after completion even on errors', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const store = useStockStore()

      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.getAll).mockResolvedValue([])
      vi.mocked(stockDB.get).mockRejectedValue(new Error('Not found'))

      await store.loadStocks()
      expect(store.loading).toBe(false)

      await store.updateAllStocks(['1', '2'])

      expect(store.loading).toBe(false)
    })

    it('should call loadStocks after completion', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const store = useStockStore()

      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.getAll).mockResolvedValue([])
      vi.mocked(stockDB.get).mockRejectedValue(new Error('Not found'))

      await store.loadStocks()
      await store.updateAllStocks(['1'])

      expect(stockDB.getAll).toHaveBeenCalled()
    })
  })

  describe('re-exports', () => {
    it('should export useStockListStore', () => {
      expect(useStockListStore).toBeDefined()
      expect(typeof useStockListStore).toBe('function')
    })

    it('should export useStockApiStore', () => {
      expect(useStockApiStore).toBeDefined()
      expect(typeof useStockApiStore).toBe('function')
    })

    it('should export useStockUIStore', () => {
      expect(useStockUIStore).toBeDefined()
      expect(typeof useStockUIStore).toBe('function')
    })
  })
})
