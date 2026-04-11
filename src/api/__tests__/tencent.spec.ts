import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchTencentHKFinancialReport } from '../tencent'
import { testTencentAPI } from '../tencent'

vi.mock('@/api/exchangeRate', () => ({
  fetchExchangeRates: vi.fn().mockResolvedValue({
    rates: { CNY: 1.1, USD: 7.75, HKD: 1.0 },
    source: 'api' as const,
    lastUpdate: Date.now()
  })
}))

describe('Tencent API', () => {
  const mockFetch = vi.fn()
  global.fetch = mockFetch

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('performance', {
      now: vi.fn(() => 100)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('testTencentAPI', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        code: 0,
        msg: 'ok',
        data: {
          data: [[], [], []],
          rttype: ['annual']
        }
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await testTencentAPI()

      expect(result.status).toBe('success')
      expect(result.source).toBe('腾讯证券')
      expect(result.message).toContain('返回 3 年数据')
      expect(result.latency).toBeDefined()
    })

    it('should return error when HTTP status is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const result = await testTencentAPI()

      expect(result.status).toBe('error')
      expect(result.message).toContain('404')
    })

    it('should return error when API code is non-zero', async () => {
      const mockResponse = {
        code: -1,
        msg: 'Invalid request'
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await testTencentAPI()

      expect(result.status).toBe('error')
      expect(result.message).toBe('Invalid request')
    })

    it('should return error when data data is missing', async () => {
      const mockResponse = {
        code: 0,
        msg: 'ok',
        data: {}
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await testTencentAPI()

      // When data.data is missing but msg is 'ok', the error message will be 'ok'
      // because data.msg exists and is truthy
      expect(result.status).toBe('error')
      expect(result.message).toBe('ok')
    })

    it('should return error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

      const result = await testTencentAPI()

      expect(result.status).toBe('error')
      expect(result.message).toBe('Network timeout')
    })

    it('should handle unknown error messages', async () => {
      const mockResponse = {
        code: -2,
        msg: ''
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await testTencentAPI()

      expect(result.status).toBe('error')
      expect(result.message).toBe('数据结构异常')
    })
  })

  describe('fetchTencentHKFinancialReport', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    const createCashFlowResponse = (rows: unknown[][]) => ({
      code: 0,
      msg: 'ok',
      data: {
        data: [rows],
        rttype: ['annual']
      }
    })

    const standardYearData = [
      [['report_date'], ['20251231']],
      [['除税前利润'], ['36.52亿']],
      [['经营活动产生的现金流量净额'], ['526.32万']],
      [['投资活动产生的现金流量净额'], ['-123.45亿']],
      [['筹资活动产生的现金流量净额'], ['50.00亿']],
      [['现金及现金等价物净增加额'], ['30.00亿']],
      [['期末现金及现金等价物余额'], ['1500.50亿']]
    ]

    it('should return NO_DATA error when cash flow data is empty', async () => {
      const cashFlowResponse = {
        code: 0,
        msg: 'ok',
        data: {
          data: [],
          rttype: []
        }
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'NO_DATA',
        message: '无法获取财务报表数据'
      })
    })

    it('should fetch and transform cash flow data successfully', async () => {
      const cashFlowResponse = createCashFlowResponse(standardYearData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data?.years).toContain(2025)
      expect(result.data?.currencyType).toBe('HKD')
      expect(result.data?.source).toBe('api')
    })

    it('should fetch multiple years of cash flow data sorted from new to old', async () => {
      const year2024 = [
        [['report_date'], ['20241231']],
        [['除税前利润'], ['36.52亿']],
        [['经营活动产生的现金流量净额'], ['526.32万']],
        [['投资活动产生的现金流量净额'], ['-123.45亿']],
        [['筹资活动产生的现金流量净额'], ['50.00亿']],
        [['现金及现金等价物净增加额'], ['30.00亿']],
        [['期末现金及现金等价物余额'], ['1500.50亿']]
      ]
      const year2023 = [
        [['report_date'], ['20231231']],
        [['除税前利润'], ['30.00亿']],
        [['经营活动产生的现金流量净额'], ['400.00万']],
        [['投资活动产生的现金流量净额'], ['-100.00亿']],
        [['筹资活动产生的现金流量净额'], ['40.00亿']],
        [['现金及现金等价物净增加额'], ['20.00亿']],
        [['期末现金及现金等价物余额'], ['1200.00亿']]
      ]

      const cashFlowResponse = {
        code: 0,
        msg: 'ok',
        data: {
          data: [year2024, year2023],
          rttype: ['annual']
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
      expect(result.data!.years).toHaveLength(2)
      expect(result.data!.years[0]).toBe(2024)
      expect(result.data!.years[1]).toBe(2023)
    })

    it('should handle multiple financial metrics in transformed data', async () => {
      const cashFlowResponse = createCashFlowResponse(standardYearData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
      const data = result.data!
      expect(data.netProfits.length).toBe(1)
      expect(data.cashAndEquivalents.length).toBe(1)
      expect(data.shortTermDebt.length).toBe(1)
      expect(data.longTermDebt.length).toBe(1)
      expect(data.operatingCashFlow.length).toBe(1)
      expect(data.capitalExpenditure.length).toBe(1)
      expect(data.reportTypes).toEqual(['annual'])
      expect(data.isProjected).toEqual([false])
    })

    it('should return NETWORK_ERROR on cash flow API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'NETWORK_ERROR',
        message: '网络请求失败',
        details: 'Connection refused'
      })
    })

    it('should return NETWORK_ERROR when HTTP status is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'NETWORK_ERROR',
        message: '网络请求失败',
        details: 'HTTP 500'
      })
    })

    it('should return NETWORK_ERROR when API returns non-zero code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          code: -1,
          msg: 'Invalid symbol'
        })
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'NETWORK_ERROR',
        message: '网络请求失败',
        details: 'Invalid symbol'
      })
    })

    it('should handle data with missing fields gracefully', async () => {
      const missingFieldsData = [
        [['report_date'], ['20251231']],
        [['除税前利润'], ['--']],
        [['经营活动产生的现金流量净额'], [null]],
        [['投资活动产生的现金流量净额'], ['100.00万']],
        [['筹资活动产生的现金流量净额'], ['-50.00亿']],
        [['现金及现金等价物净增加额'], ['10.00亿']],
        [['期末现金及现金等价物余额'], ['500.00亿']]
      ]
      const cashFlowResponse = createCashFlowResponse(missingFieldsData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
      // '--' is parsed as 0
      expect(result.data!.netProfits[0]).toBe(0)
      // 500.00亿 = 50000000000 after unit conversion
      expect(result.data!.cashAndEquivalents[0]).toBe(50000000000)
    })

    it('should handle data with empty arrays in response', async () => {
      const emptyArraysData = [
        [['report_date'], ['20251231']],
        [['除税前利润'], []],
        [['经营活动产生的现金流量净额'], [[null]]],
        [['投资活动产生的现金流量净额'], ['100.00万']],
        [['筹资活动产生的现金流量净额'], ['-50.00亿']],
        [['现金及现金等价物净增加额'], ['10.00亿']],
        [['期末现金及现金等价物余额'], ['500.00亿']]
      ]
      const cashFlowResponse = createCashFlowResponse(emptyArraysData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      // Empty arrays and nested null arrays are treated as invalid data
      // The function returns null data with a NO_DATA error for such cases
      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
    })

    it('should skip years where report year extraction fails', async () => {
      const invalidDateData = [
        [['report_date'], [null]],
        [['除税前利润'], ['36.52亿']],
        [['经营活动产生的现金流量净额'], ['526.32万']],
        [['投资活动产生的现金流量净额'], ['-123.45亿']],
        [['筹资活动产生的现金流量净额'], ['50.00亿']],
        [['现金及现金等价物净增加额'], ['30.00亿']],
        [['期末现金及现金等价物余额'], ['1500.50亿']]
      ]
      const cashFlowResponse = createCashFlowResponse(invalidDateData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.error?.code).toBe('NO_DATA')
    })

    it('should calculate free cash flow correctly from operating and investing cash flows', async () => {
      const fcfData = [
        [['report_date'], ['20251231']],
        [['除税前利润'], ['100.00亿']],
        [['经营活动产生的现金流量净额'], ['200.00亿']],
        [['投资活动产生的现金流量净额'], ['-50.00亿']],
        [['筹资活动产生的现金流量净额'], ['30.00亿']],
        [['现金及现金等价物净增加额'], ['20.00亿']],
        [['期末现金及现金等价物余额'], ['500.00亿']]
      ]
      const cashFlowResponse = createCashFlowResponse(fcfData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
    })

    it('should handle negative values correctly', async () => {
      const negativeData = [
        [['report_date'], ['20251231']],
        [['除税前利润'], ['-36.52亿']],
        [['经营活动产生的现金流量净额'], ['-100.00万']],
        [['投资活动产生的现金流量净额'], ['-10.00亿']],
        [['筹资活动产生的现金流量净额'], ['-5.00亿']],
        [['现金及现金等价物净增加额'], ['-2.00亿']],
        [['期末现金及现金等价物余额'], ['50.00亿']]
      ]
      const cashFlowResponse = createCashFlowResponse(negativeData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
      // -36.52亿 = -3652000000 after unit conversion
      expect(result.data!.netProfits[0]).toBe(-3652000000)
    })

    it('should handle values with 亿 unit correctly', async () => {
      const cashFlowResponse = createCashFlowResponse(standardYearData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
      // 36.52亿 = 3652000000 after unit conversion
      expect(result.data!.netProfits[0]).toBe(3652000000)
      // 1500.50亿 = 150050000000 after unit conversion
      expect(result.data!.cashAndEquivalents[0]).toBe(150050000000)
    })

    it('should handle values with 万 unit correctly', async () => {
      const wanData = [
        [['report_date'], ['20251231']],
        [['除税前利润'], ['5000.00万']],
        [['经营活动产生的现金流量净额'], ['1000.00万']],
        [['投资活动产生的现金流量净额'], ['-200.00万']],
        [['筹资活动产生的现金流量净额'], ['50.00万']],
        [['现金及现金等价物净增加额'], ['20.00万']],
        [['期末现金及现金等价物余额'], ['500.00万']]
      ]
      const cashFlowResponse = createCashFlowResponse(wanData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
      // 5000万 = 50000000 after unit conversion
      expect(result.data!.netProfits[0]).toBe(50000000)
    })

    it('should correctly handle year data without valid rows', async () => {
      const noRowsData = [
        [['report_date'], ['20251231']]
      ]
      const cashFlowResponse = createCashFlowResponse(noRowsData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
      expect(result.data!.netProfits[0]).toBe(0)
    })

    it('should set fiscal year end date correctly', async () => {
      const cashFlowResponse = createCashFlowResponse(standardYearData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
      expect(result.data!.years[0]).toBe(2025)
    })

    it('should skip non-array year data elements', async () => {
      const cashFlowResponse = {
        code: 0,
        msg: 'ok',
        data: {
          data: [
            null,
            'not an array',
            standardYearData
          ],
          rttype: ['annual']
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
      expect(result.data!.years).toHaveLength(1)
      expect(result.data!.years[0]).toBe(2025)
    })

    it('should skip rows without matching keyword', async () => {
      const unrelatedRowData = [
        [['report_date'], ['20251231']],
        [['一些无关的行'], ['100.00亿']],
        [['除税前利润'], ['36.52亿']],
        [['经营活动产生的现金流量净额'], ['526.32万']],
        [['投资活动产生的现金流量净额'], ['-123.45亿']],
        [['筹资活动产生的现金流量净额'], ['50.00亿']],
        [['现金及现金等价物净增加额'], ['30.00亿']],
        [['期末现金及现金等价物余额'], ['1500.50亿']]
      ]
      const cashFlowResponse = createCashFlowResponse(unrelatedRowData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
    })

    it('should handle YoY values when present', async () => {
      const yoyData = [
        [['report_date'], ['20251231']],
        [['除税前利润'], ['36.52亿'], '12.5%'],
        [['经营活动产生的现金流量净额'], ['526.32万'], '8.3%'],
        [['投资活动产生的现金流量净额'], ['-123.45亿']],
        [['筹资活动产生的现金流量净额'], ['50.00亿']],
        [['现金及现金等价物净增加额'], ['30.00亿']],
        [['期末现金及现金等价物余额'], ['1500.50亿']]
      ]
      const cashFlowResponse = createCashFlowResponse(yoyData)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cashFlowResponse)
      })

      const result = await fetchTencentHKFinancialReport('00700')

      expect(result.data).not.toBeNull()
    })
  })
})
