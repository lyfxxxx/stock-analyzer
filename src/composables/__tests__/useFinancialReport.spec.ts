import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { detectMarket, useFinancialReport, useFinancialReportValuation } from '../useFinancialReport'
import type { FinancialReportData } from '@/types/financialReport'
import type { YearlyData } from '@/types/stock'

// Mock dependencies
vi.mock('@/api/financialReportA', () => ({
  fetchAStockFinancialReport: vi.fn()
}))

vi.mock('@/api/financialReportHK', () => ({
  fetchHKStockFinancialReport: vi.fn()
}))

vi.mock('@/utils/calculator', () => ({
  calculateNetCash: vi.fn(),
  calculateFreeCashFlow: vi.fn(),
  calculateValuations: vi.fn()
}))

vi.mock('@/utils/excelParser', () => ({
  buildYearlyData: vi.fn()
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn()
  }
}))

import { fetchAStockFinancialReport } from '@/api/financialReportA'
import { fetchHKStockFinancialReport } from '@/api/financialReportHK'
import { calculateNetCash, calculateFreeCashFlow, calculateValuations } from '@/utils/calculator'
import { buildYearlyData } from '@/utils/excelParser'

describe('useFinancialReport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detectMarket', () => {
    it('should return HK for 5-digit numeric code', () => {
      expect(detectMarket('00700')).toBe('HK')
      expect(detectMarket('12345')).toBe('HK')
      expect(detectMarket('99999')).toBe('HK')
    })

    it('should return A for code with .SH suffix', () => {
      expect(detectMarket('600519.SH')).toBe('A')
      expect(detectMarket('000001.SH')).toBe('A')
    })

    it('should return A for code with .SZ suffix', () => {
      expect(detectMarket('000001.SZ')).toBe('A')
      expect(detectMarket('300750.SZ')).toBe('A')
    })

    it('should return HK for code with .HK suffix', () => {
      expect(detectMarket('00700.HK')).toBe('HK')
      expect(detectMarket('09988.HK')).toBe('HK')
    })

    it('should return A for code starting with 6 (Shanghai)', () => {
      expect(detectMarket('600519')).toBe('A')
      expect(detectMarket('600000')).toBe('A')
    })

    it('should return A for other codes (default to Shenzhen)', () => {
      expect(detectMarket('000001')).toBe('A')
      expect(detectMarket('300750')).toBe('A')
    })

    it('should clean suffix before checking length', () => {
      expect(detectMarket('00700.SH')).toBe('HK')
      expect(detectMarket('00700.SZ')).toBe('HK')
      expect(detectMarket('00700.HK')).toBe('HK')
    })
  })

  describe('useFinancialReport', () => {
    const createMockFinancialData = (): FinancialReportData => ({
      years: [2023, 2022, 2021],
      netProfits: [100, 90, 80],
      cashAndEquivalents: [50, 40, 30],
      shortTermDebt: [10, 10, 10],
      longTermDebt: [20, 20, 20],
      operatingCashFlow: [80, 70, 60],
      capitalExpenditure: [-10, -10, -10],
      currentRatio: [2, 1.8, 1.5],
      currentRatioProjected: [false, false, false],
      peRatio: [15, 14, 13],
      peRatioProjected: [false, false, false],
      currencyType: 'CNY',
      baseCurrency: 'HKD',
      source: 'api',
      reportTypes: ['annual', 'annual', 'annual'],
      isProjected: [false, false, false],
      netProfitProjected: [false, false, false],
      freeCashFlowProjected: [false, false, false],
      netCashProjected: [false, false, false],
    })

    it('should return initial state', () => {
      const { loading, error, data, fetch, clear } = useFinancialReport()

      expect(loading.value).toBe(false)
      expect(error.value).toBe(null)
      expect(data.value).toBe(null)
      expect(typeof fetch).toBe('function')
      expect(typeof clear).toBe('function')
    })

    describe('fetch', () => {
      it('should fetch HK stock financial report for HK market', async () => {
        const mockData = createMockFinancialData()
        const mockFetchHK = fetchHKStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchHK.mockResolvedValueOnce({ data: mockData, error: null })

        const { fetch: fetchFn } = useFinancialReport()
        const result = await fetchFn('00700', 'HK')

        expect(mockFetchHK).toHaveBeenCalledWith('00700')
        expect(result).toEqual(mockData)
      })

      it('should fetch A stock financial report for A market', async () => {
        const mockData = createMockFinancialData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const { fetch: fetchFn } = useFinancialReport()
        const result = await fetchFn('600519', 'A')

        expect(mockFetchA).toHaveBeenCalledWith('600519')
        expect(result).toEqual(mockData)
      })

      it('should auto-detect market as HK for 5-digit code', async () => {
        const mockData = createMockFinancialData()
        const mockFetchHK = fetchHKStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchHK.mockResolvedValueOnce({ data: mockData, error: null })

        const { fetch: fetchFn } = useFinancialReport()
        await fetchFn('00700')

        expect(mockFetchHK).toHaveBeenCalledWith('00700')
      })

      it('should auto-detect market as A for code starting with 6', async () => {
        const mockData = createMockFinancialData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const { fetch: fetchFn } = useFinancialReport()
        await fetchFn('600519')

        expect(mockFetchA).toHaveBeenCalledWith('600519')
      })

      it('should set loading to true during fetch', async () => {
        const mockData = createMockFinancialData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        
        mockFetchA.mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return { data: mockData, error: null }
        })

        const { fetch: fetchFn, loading } = useFinancialReport()
        const fetchPromise = fetchFn('600519')

        // Loading should be true during fetch
        expect(loading.value).toBe(true)

        await fetchPromise

        // Loading should be false after fetch
        expect(loading.value).toBe(false)
      })

      it('should set data on successful fetch', async () => {
        const mockData = createMockFinancialData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const { fetch: fetchFn, data } = useFinancialReport()
        await fetchFn('600519')

        expect(data.value).toEqual(mockData)
      })

      it('should set error on API error response', async () => {
        const apiError = {
          code: 'NO_DATA' as const,
          message: '无法获取数据',
          details: 'No data found'
        }
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: null, error: apiError })

        const { fetch: fetchFn, error } = useFinancialReport()
        const result = await fetchFn('600519')

        expect(result).toBeNull()
        expect(error.value).toEqual(apiError)
      })

      it('should set error on network failure', async () => {
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockRejectedValueOnce(new Error('Network failure'))

        const { fetch: fetchFn, error } = useFinancialReport()
        const result = await fetchFn('600519')

        expect(result).toBeNull()
        expect(error.value).toEqual({
          code: 'NETWORK_ERROR',
          message: '获取财务数据失败',
          details: 'Network failure'
        })
      })

      it('should reset state before fetch', async () => {
        const mockData = createMockFinancialData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValue({ data: mockData, error: null })

        const { fetch: fetchFn, data, error } = useFinancialReport()

        // Pre-set some state
        data.value = { ...mockData }
        error.value = { code: 'NO_DATA', message: 'old error' }

        await fetchFn('600519')

        // State should be reset before fetch
        expect(error.value).toBeNull()
      })
    })

    describe('clear', () => {
      it('should reset all state', async () => {
        const mockData = createMockFinancialData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const { fetch: fetchFn, clear, loading, error, data } = useFinancialReport()

        await fetchFn('600519')
        expect(data.value).toEqual(mockData)

        clear()

        expect(loading.value).toBe(false)
        expect(error.value).toBe(null)
        expect(data.value).toBe(null)
      })
    })
  })

  describe('useFinancialReportValuation', () => {
    const createMockFinancialData = (): FinancialReportData => ({
      years: [2023, 2022, 2021],
      netProfits: [100, 90, 80],
      cashAndEquivalents: [50, 40, 30],
      shortTermDebt: [10, 10, 10],
      longTermDebt: [20, 20, 20],
      operatingCashFlow: [80, 70, 60],
      capitalExpenditure: [-10, -10, -10],
      currentRatio: [2, 1.8, 1.5],
      currentRatioProjected: [false, false, false],
      peRatio: [15, 14, 13],
      peRatioProjected: [false, false, false],
      currencyType: 'CNY',
      baseCurrency: 'HKD',
      source: 'api',
      reportTypes: ['annual', 'annual', 'annual'],
      isProjected: [false, false, false],
      netProfitProjected: [false, false, false],
      freeCashFlowProjected: [false, false, false],
      netCashProjected: [false, false, false],
    })

    const createMockYearlyData = (): YearlyData[] => [
      { year: 2023, freeCashFlow: 70, netProfit: 100 },
      { year: 2022, freeCashFlow: 60, netProfit: 90 },
      { year: 2021, freeCashFlow: 50, netProfit: 80 },
    ]

    it('should return initial state', () => {
      const { loading, error, calculate } = useFinancialReportValuation()

      expect(loading.value).toBe(false)
      expect(error.value).toBe(null)
      expect(typeof calculate).toBe('function')
    })

    describe('calculate', () => {
      it('should calculate valuation for HK market', async () => {
        const mockData = createMockFinancialData()
        const mockYearlyData = createMockYearlyData()
        const mockFetchHK = fetchHKStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchHK.mockResolvedValueOnce({ data: mockData, error: null })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(mockYearlyData)

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        mockCalculateNetCash.mockReturnValueOnce(20) // 50 - 10 - 20

        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        mockCalculateFreeCashFlow.mockReturnValueOnce(70) // 80 - 10

        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate } = useFinancialReportValuation()
        const result = await calculate(1000, '00700', 'HK')

        expect(mockFetchHK).toHaveBeenCalledWith('00700')
        expect(result).toEqual({
          netCash: 20,
          freeCashFlow: 70,
          netProfit: 100,
          valuation1: 10.5,
          valuation2: 8.0,
          yearlyData: mockYearlyData,
          baseCurrency: 'HKD',
          source: 'api',
          isUsingProjectedData: false
        })
      })

      it('should calculate valuation for A market', async () => {
        const mockData = createMockFinancialData()
        const mockYearlyData = createMockYearlyData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(mockYearlyData)

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        mockCalculateNetCash.mockReturnValueOnce(20)

        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        mockCalculateFreeCashFlow.mockReturnValueOnce(70)

        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate } = useFinancialReportValuation()
        const result = await calculate(1000, '600519', 'A')

        expect(mockFetchA).toHaveBeenCalledWith('600519')
        expect(result).toBeTruthy()
      })

      it('should auto-detect market as HK for 5-digit code', async () => {
        const mockData = createMockFinancialData()
        const mockYearlyData = createMockYearlyData()
        const mockFetchHK = fetchHKStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchHK.mockResolvedValueOnce({ data: mockData, error: null })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(mockYearlyData)

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        mockCalculateNetCash.mockReturnValueOnce(20)

        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        mockCalculateFreeCashFlow.mockReturnValueOnce(70)

        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate } = useFinancialReportValuation()
        await calculate(1000, '00700')

        expect(mockFetchHK).toHaveBeenCalledWith('00700')
      })

      it('should auto-detect market as A for code starting with 6', async () => {
        const mockData = createMockFinancialData()
        const mockYearlyData = createMockYearlyData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(mockYearlyData)

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        mockCalculateNetCash.mockReturnValueOnce(20)

        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        mockCalculateFreeCashFlow.mockReturnValueOnce(70)

        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate } = useFinancialReportValuation()
        await calculate(1000, '600519')

        expect(mockFetchA).toHaveBeenCalledWith('600519')
      })

      it('should set loading to true during calculation', async () => {
        const mockData = createMockFinancialData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        
        mockFetchA.mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return { data: mockData, error: null }
        })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(createMockYearlyData())

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        mockCalculateNetCash.mockReturnValueOnce(20)

        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        mockCalculateFreeCashFlow.mockReturnValueOnce(70)

        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate, loading } = useFinancialReportValuation()
        const fetchPromise = calculate(1000, '600519')

        expect(loading.value).toBe(true)

        await fetchPromise

        expect(loading.value).toBe(false)
      })

      it('should return null and set error when API returns error', async () => {
        const apiError = {
          code: 'NO_DATA' as const,
          message: '无法获取数据'
        }
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: null, error: apiError })

        const { calculate, error } = useFinancialReportValuation()
        const result = await calculate(1000, '600519')

        expect(result).toBeNull()
        expect(error.value).toBe('无法获取数据')
      })

      it('should return null and set error when API returns no data', async () => {
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: null, error: null })

        const { calculate, error } = useFinancialReportValuation()
        const result = await calculate(1000, '600519')

        expect(result).toBeNull()
        expect(error.value).toBe('获取财务数据失败')
      })

      it('should return null and set error on exception', async () => {
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockRejectedValueOnce(new Error('Unexpected error'))

        const { calculate, error } = useFinancialReportValuation()
        const result = await calculate(1000, '600519')

        expect(result).toBeNull()
        expect(error.value).toBe('Unexpected error')
      })

      it('should use latest financial data for calculations', async () => {
        const mockData = createMockFinancialData()
        const mockYearlyData = createMockYearlyData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(mockYearlyData)

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>

        mockCalculateNetCash.mockReturnValueOnce(20)
        mockCalculateFreeCashFlow.mockReturnValueOnce(70)
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate } = useFinancialReportValuation()
        await calculate(1000, '600519')

        // Verify using latest index (0) values: 50, 10, 20, 80, -10, 100
        expect(mockCalculateNetCash).toHaveBeenCalledWith(50, 10, 20)
        expect(mockCalculateFreeCashFlow).toHaveBeenCalledWith(80, -10)
        expect(mockCalculateValuations).toHaveBeenCalledWith(1000, 20, 70, 100)
      })

      it('should handle zero cash values', async () => {
        const mockData = createMockFinancialData()
        mockData.cashAndEquivalents = [0, 40, 30]
        const mockYearlyData = createMockYearlyData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(mockYearlyData)

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>

        mockCalculateNetCash.mockReturnValueOnce(-30) // 0 - 10 - 20
        mockCalculateFreeCashFlow.mockReturnValueOnce(70)
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate } = useFinancialReportValuation()
        const result = await calculate(1000, '600519')

        expect(mockCalculateNetCash).toHaveBeenCalledWith(0, 10, 20)
        expect(result).toBeTruthy()
      })

      it('should handle zero debt values', async () => {
        const mockData = createMockFinancialData()
        mockData.shortTermDebt = [0, 10, 10]
        mockData.longTermDebt = [0, 20, 20]
        const mockYearlyData = createMockYearlyData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(mockYearlyData)

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>

        mockCalculateNetCash.mockReturnValueOnce(50) // 50 - 0 - 0
        mockCalculateFreeCashFlow.mockReturnValueOnce(70)
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate } = useFinancialReportValuation()
        const result = await calculate(1000, '600519')

        expect(mockCalculateNetCash).toHaveBeenCalledWith(50, 0, 0)
        expect(result).toBeTruthy()
      })

      it('should call buildYearlyData with correct parameters', async () => {
        const mockData = createMockFinancialData()
        const mockYearlyData = createMockYearlyData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(mockYearlyData)

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>

        mockCalculateNetCash.mockReturnValueOnce(20)
        mockCalculateFreeCashFlow.mockReturnValueOnce(70)
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate } = useFinancialReportValuation()
        await calculate(1000, '600519')

        expect(mockBuildYearlyData).toHaveBeenCalledWith(
          mockData.years,
          mockData.operatingCashFlow,
          mockData.capitalExpenditure,
          mockData.netProfits,
          mockData.isProjected
        )
      })

      it('should set isUsingProjectedData based on latest isProjected flag', async () => {
        const mockData = createMockFinancialData()
        mockData.isProjected = [true, false, false] // Latest is projected
        const mockYearlyData = createMockYearlyData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(mockYearlyData)

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>

        mockCalculateNetCash.mockReturnValueOnce(20)
        mockCalculateFreeCashFlow.mockReturnValueOnce(70)
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate } = useFinancialReportValuation()
        const result = await calculate(1000, '600519')

        expect(result?.isUsingProjectedData).toBe(true)
      })

      it('should set isUsingProjectedData to false when latest is not projected', async () => {
        const mockData = createMockFinancialData()
        mockData.isProjected = [false, false, false]
        const mockYearlyData = createMockYearlyData()
        const mockFetchA = fetchAStockFinancialReport as ReturnType<typeof vi.fn>
        mockFetchA.mockResolvedValueOnce({ data: mockData, error: null })

        const mockBuildYearlyData = buildYearlyData as ReturnType<typeof vi.fn>
        mockBuildYearlyData.mockReturnValueOnce(mockYearlyData)

        const mockCalculateNetCash = calculateNetCash as ReturnType<typeof vi.fn>
        const mockCalculateFreeCashFlow = calculateFreeCashFlow as ReturnType<typeof vi.fn>
        const mockCalculateValuations = calculateValuations as ReturnType<typeof vi.fn>

        mockCalculateNetCash.mockReturnValueOnce(20)
        mockCalculateFreeCashFlow.mockReturnValueOnce(70)
        mockCalculateValuations.mockReturnValueOnce({
          valuation1: 10.5,
          valuation2: 8.0
        })

        const { calculate } = useFinancialReportValuation()
        const result = await calculate(1000, '600519')

        expect(result?.isUsingProjectedData).toBe(false)
      })
    })
  })
})
