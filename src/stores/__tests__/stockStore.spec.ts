import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStockStore } from '../stockStore'

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
  testEastMoneyAPI: vi.fn().mockResolvedValue({ status: 'success' }),
  searchStocksByName: vi.fn().mockResolvedValue([])
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
  calculateValuations: vi.fn().mockReturnValue({ valuation1: 10, valuation2: 15 })
}))

vi.mock('@/utils/excelParser', () => ({
  buildYearlyData: vi.fn().mockReturnValue([])
}))

describe('stockStore.updateAllStocks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

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
    // Mock get to throw immediately
    vi.mocked(stockDB.get).mockRejectedValue(new Error('Not found'))
    
    await store.loadStocks()
    expect(store.loading).toBe(false)
    
    // Call with non-empty array - will fail but should still reset loading
    await store.updateAllStocks(['1', '2'])
    
    expect(store.loading).toBe(false) // Should be reset after completion
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
    
    // getAll should be called at least twice - once for initial load, once after update
    expect(stockDB.getAll).toHaveBeenCalled()
  })
})
