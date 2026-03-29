import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchAStockFinancialReport } from '../financialReportA'
import { fetchHKStockFinancialReport } from '../financialReportHK'
import { detectMarket, useFinancialReport, useFinancialReportValuation } from '@/composables/useFinancialReport'
import { financialReportRateLimiter } from '@/utils/rateLimiter'

vi.mock('@/api/exchangeRate', () => ({
  fetchExchangeRates: vi.fn().mockResolvedValue({
    rates: { CNY: 1.10, HKD: 1, USD: 7.75 },
    source: 'api',
  }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('financialReportA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    financialReportRateLimiter.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchAStockFinancialReport', () => {
    it('should fetch A-stock financial report successfully', async () => {
      const mockBalanceSheet = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              SECURITY_NAME_ABBR: '分众传媒',
              REPORT_DATE: '2024-12-31 00:00:00',
              MONETARYFUNDS: 3536558068.47,
              TRADE_FINASSET_NOTFVTPL: 2643951787.67,
              SHORT_LOAN: 101638600.69,
              LONG_LOAN: 0,
            },
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              SECURITY_NAME_ABBR: '分众传媒',
              REPORT_DATE: '2023-12-31 00:00:00',
              MONETARYFUNDS: 3409471211.68,
              TRADE_FINASSET_NOTFVTPL: 2500000000,
              SHORT_LOAN: 50000000,
              LONG_LOAN: 0,
            },
          ],
          count: 2,
        },
      }

      const mockIncomeStatement = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              SECURITY_NAME_ABBR: '分众传媒',
              REPORT_DATE: '2024-12-31 00:00:00',
              PARENT_NETPROFIT: 5155394136.42,
            },
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              SECURITY_NAME_ABBR: '分众传媒',
              REPORT_DATE: '2023-12-31 00:00:00',
              PARENT_NETPROFIT: 4800000000,
            },
          ],
          count: 2,
        },
      }

      const mockCashFlow = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              SECURITY_NAME_ABBR: '分众传媒',
              REPORT_DATE: '2024-12-31 00:00:00',
              NETCASH_OPERATE: 6641811190.52,
              CONSTRUCT_LONG_ASSET: 318344915.55,
            },
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              SECURITY_NAME_ABBR: '分众传媒',
              REPORT_DATE: '2023-12-31 00:00:00',
              NETCASH_OPERATE: 6500000000,
              CONSTRUCT_LONG_ASSET: 300000000,
            },
          ],
          count: 2,
        },
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBalanceSheet) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIncomeStatement) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCashFlow) })

      const result = await fetchAStockFinancialReport('002027')

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data?.years).toEqual([2024, 2023])
      expect(result.data?.currencyType).toBe('CNY')
      expect(result.data?.baseCurrency).toBe('CNY')
      expect(result.data?.source).toBe('api')
      
      expect(result.data?.netProfits.length).toBe(2)
      expect(result.data?.cashAndEquivalents.length).toBe(2)
      expect(result.data?.capitalExpenditure[0]).toBeLessThan(0)
    })

    it('should return error when API returns no data', async () => {
      const mockEmptyResponse = {
        version: '1.0',
        success: false,
        result: null,
      }

      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockEmptyResponse) })

      const result = await fetchAStockFinancialReport('999999')

      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
      expect(result.error?.code).toBe('NO_DATA')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'))

      const result = await fetchAStockFinancialReport('002027')

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('NETWORK_ERROR')
    })

    it('should calculate total cash correctly (MONETARYFUNDS + TRADE_FINASSET_NOTFVTPL)', async () => {
      const mockBalanceSheet = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              REPORT_DATE: '2024-12-31 00:00:00',
              MONETARYFUNDS: 1000000000,
              TRADE_FINASSET_NOTFVTPL: 500000000,
              SHORT_LOAN: 100000000,
              LONG_LOAN: 0,
            },
          ],
          count: 1,
        },
      }

      const mockIncomeStatement = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              REPORT_DATE: '2024-12-31 00:00:00',
              PARENT_NETPROFIT: 500000000,
            },
          ],
          count: 1,
        },
      }

      const mockCashFlow = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              REPORT_DATE: '2024-12-31 00:00:00',
              NETCASH_OPERATE: 600000000,
              CONSTRUCT_LONG_ASSET: 100000000,
            },
          ],
          count: 1,
        },
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBalanceSheet) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIncomeStatement) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCashFlow) })

      const result = await fetchAStockFinancialReport('002027')

      expect(result.data).not.toBeNull()
      // A-stock data is in CNY (no conversion applied)
      const totalCashInYuan = 1000000000 + 500000000
      const expectedInCNY = totalCashInYuan / 100000000
      expect(result.data?.cashAndEquivalents[0]).toBeCloseTo(expectedInCNY, 1)
    })

    it('should handle null values in API response', async () => {
      const mockBalanceSheet = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              REPORT_DATE: '2024-12-31 00:00:00',
              MONETARYFUNDS: null,
              TRADE_FINASSET_NOTFVTPL: null,
              SHORT_LOAN: null,
              LONG_LOAN: null,
            },
          ],
          count: 1,
        },
      }

      const mockIncomeStatement = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              REPORT_DATE: '2024-12-31 00:00:00',
              PARENT_NETPROFIT: null,
            },
          ],
          count: 1,
        },
      }

      const mockCashFlow = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            {
              SECUCODE: '002027.SZ',
              SECURITY_CODE: '002027',
              REPORT_DATE: '2024-12-31 00:00:00',
              NETCASH_OPERATE: null,
              CONSTRUCT_LONG_ASSET: null,
            },
          ],
          count: 1,
        },
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBalanceSheet) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIncomeStatement) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCashFlow) })

      const result = await fetchAStockFinancialReport('002027')

      expect(result.data).not.toBeNull()
      expect(result.data?.cashAndEquivalents[0]).toBe(0)
      expect(result.data?.shortTermDebt[0]).toBe(0)
      expect(result.data?.longTermDebt[0]).toBe(0)
    })
  })
})

describe('financialReportHK', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    financialReportRateLimiter.clear()
  })

  describe('fetchHKStockFinancialReport', () => {
    it('should fetch HK stock financial report successfully', async () => {
      const mockBalanceSheet = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '09987.HK', SECURITY_CODE: '09987', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004002010', STD_ITEM_NAME: '现金及等价物', AMOUNT: 5197213200 },
            { SECUCODE: '09987.HK', SECURITY_CODE: '09987', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004001030', STD_ITEM_NAME: '中长期存款', AMOUNT: 7820979200 },
            { SECUCODE: '09987.HK', SECURITY_CODE: '09987', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004002008', STD_ITEM_NAME: '短期投资', AMOUNT: 8058196400 },
            { SECUCODE: '09987.HK', SECURITY_CODE: '09987', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004011010', STD_ITEM_NAME: '短期贷款', AMOUNT: 912926800 },
            { SECUCODE: '09987.HK', SECURITY_CODE: '09987', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004020001', STD_ITEM_NAME: '长期贷款', AMOUNT: 0 },
          ],
          count: 5,
        },
      }

      const mockIncomeStatement = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '09987.HK', SECURITY_CODE: '09987', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004025002', STD_ITEM_NAME: '股东应占溢利', AMOUNT: 6548632400 },
          ],
          count: 1,
        },
      }

      const mockCashFlow = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '09987.HK', SECURITY_CODE: '09987', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '003999', STD_ITEM_NAME: '经营业务现金净额', AMOUNT: 10200339600 },
            { SECUCODE: '09987.HK', SECURITY_CODE: '09987', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '005005', STD_ITEM_NAME: '购建固定资产', AMOUNT: 0 },
          ],
          count: 2,
        },
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBalanceSheet) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIncomeStatement) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCashFlow) })

      const result = await fetchHKStockFinancialReport('09987')

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data?.years).toEqual([2024])
      expect(result.data?.currencyType).toBe('CNY')
      expect(result.data?.baseCurrency).toBe('HKD')
    })

    it('should include latest year when three statements report dates are inconsistent', async () => {
      const mockBalanceSheet = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2025-06-30 00:00:00', STD_ITEM_CODE: '004002010', STD_ITEM_NAME: '现金及等价物', AMOUNT: 1000000000 },
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2025-06-30 00:00:00', STD_ITEM_CODE: '004011010', STD_ITEM_NAME: '短期贷款', AMOUNT: 100000000 },
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2025-06-30 00:00:00', STD_ITEM_CODE: '004020001', STD_ITEM_NAME: '长期贷款', AMOUNT: 50000000 },
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004002010', STD_ITEM_NAME: '现金及等价物', AMOUNT: 900000000 },
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004011010', STD_ITEM_NAME: '短期贷款', AMOUNT: 80000000 },
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004020001', STD_ITEM_NAME: '长期贷款', AMOUNT: 40000000 },
          ],
          count: 6,
        },
      }

      const mockIncomeStatement = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2025-12-31 00:00:00', STD_ITEM_CODE: '004025002', STD_ITEM_NAME: '股东应占溢利', AMOUNT: 2000000000 },
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004025002', STD_ITEM_NAME: '股东应占溢利', AMOUNT: 1800000000 },
          ],
          count: 2,
        },
      }

      const mockCashFlow = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2025-12-31 00:00:00', STD_ITEM_CODE: '003999', STD_ITEM_NAME: '经营业务现金净额', AMOUNT: 2500000000 },
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2025-12-31 00:00:00', STD_ITEM_CODE: '005005', STD_ITEM_NAME: '购建固定资产', AMOUNT: 300000000 },
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '003999', STD_ITEM_NAME: '经营业务现金净额', AMOUNT: 2200000000 },
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '005005', STD_ITEM_NAME: '购建固定资产', AMOUNT: 250000000 },
          ],
          count: 4,
        },
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBalanceSheet) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIncomeStatement) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCashFlow) })

      const result = await fetchHKStockFinancialReport('00700')

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data?.years).toEqual([2025, 2024])
      expect(result.data?.isProjected).toEqual([false, false])
    })

    it('should calculate total cash correctly (sum of cash-related fields)', async () => {
      const mockBalanceSheet = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '03613.HK', SECURITY_CODE: '03613', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004002010', STD_ITEM_NAME: '现金及等价物', AMOUNT: 1641937446.96 },
            { SECUCODE: '03613.HK', SECURITY_CODE: '03613', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004002011', STD_ITEM_NAME: '短期存款', AMOUNT: 43226621.16 },
            { SECUCODE: '03613.HK', SECURITY_CODE: '03613', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004011010', STD_ITEM_NAME: '短期贷款', AMOUNT: 65748.84 },
            { SECUCODE: '03613.HK', SECURITY_CODE: '03613', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004020001', STD_ITEM_NAME: '长期贷款', AMOUNT: 131497.68 },
          ],
          count: 4,
        },
      }

      const mockIncomeStatement = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '03613.HK', SECURITY_CODE: '03613', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004025002', STD_ITEM_NAME: '股东应占溢利', AMOUNT: 463277439.12 },
          ],
          count: 1,
        },
      }

      const mockCashFlow = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '03613.HK', SECURITY_CODE: '03613', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '003999', STD_ITEM_NAME: '经营业务现金净额', AMOUNT: -201183116.04 },
            { SECUCODE: '03613.HK', SECURITY_CODE: '03613', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '005005', STD_ITEM_NAME: '购建固定资产', AMOUNT: 39975294.72 },
          ],
          count: 2,
        },
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBalanceSheet) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIncomeStatement) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCashFlow) })

      const result = await fetchHKStockFinancialReport('03613')

      expect(result.data).not.toBeNull()
      // HK stock data is in CNY, need to convert to HKD (divide by rate 1.10)
      const cnyToHkd = 1 / 1.10
      const expectedTotalCash = ((1641937446.96 + 43226621.16) / 100000000) * cnyToHkd
      expect(result.data?.cashAndEquivalents[0]).toBeCloseTo(expectedTotalCash, 1)
      
      const expectedShortDebt = (65748.84 / 100000000) * cnyToHkd
      expect(result.data?.shortTermDebt[0]).toBeCloseTo(expectedShortDebt, 1)
      
      const expectedLongDebt = (131497.68 / 100000000) * cnyToHkd
      expect(result.data?.longTermDebt[0]).toBeCloseTo(expectedLongDebt, 1)
      
      expect(result.data?.capitalExpenditure[0]).toBeLessThan(0)
    })

    it('should handle missing loan fields as zero', async () => {
      const mockBalanceSheet = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004002010', STD_ITEM_NAME: '现金及等价物', AMOUNT: 58684080.84 },
          ],
          count: 1,
        },
      }

      const mockIncomeStatement = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004025002', STD_ITEM_NAME: '股东应占溢利', AMOUNT: 100000000 },
          ],
          count: 1,
        },
      }

      const mockCashFlow = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00700.HK', SECURITY_CODE: '00700', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '003999', STD_ITEM_NAME: '经营业务现金净额', AMOUNT: 50000000 },
          ],
          count: 1,
        },
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBalanceSheet) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIncomeStatement) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCashFlow) })

      const result = await fetchHKStockFinancialReport('00700')

      expect(result.data).not.toBeNull()
      expect(result.data?.shortTermDebt[0]).toBe(0)
      expect(result.data?.longTermDebt[0]).toBe(0)
      expect(result.data?.capitalExpenditure[0]).toBe(0)
    })

    it('should sum capital expenditure from multiple fields (005005 + 005997 + 005007)', async () => {
      const mockBalanceSheet = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004002010', STD_ITEM_NAME: '现金及等价物', AMOUNT: 1000000000 },
          ],
          count: 1,
        },
      }

      const mockIncomeStatement = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004025002', STD_ITEM_NAME: '股东应占溢利', AMOUNT: 1000000000 },
          ],
          count: 1,
        },
      }

      const mockCashFlow = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '003999', STD_ITEM_NAME: '经营业务现金净额', AMOUNT: 2000000000 },
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '005005', STD_ITEM_NAME: '购建固定资产', AMOUNT: 500000000 },
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '005997', STD_ITEM_NAME: '投资业务其他项目', AMOUNT: 300000000 },
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '005007', STD_ITEM_NAME: '购建无形资产及其他资产', AMOUNT: 200000000 },
          ],
          count: 4,
        },
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBalanceSheet) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIncomeStatement) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCashFlow) })

      const result = await fetchHKStockFinancialReport('00883')

      expect(result.data).not.toBeNull()
      expect(result.data?.years).toEqual([2024])
      
      const cnyToHkd = 1 / 1.10
      const expectedCapEx = -((500000000 + 300000000 + 200000000) / 100000000) * cnyToHkd
      expect(result.data?.capitalExpenditure[0]).toBeCloseTo(expectedCapEx, 1)
    })

    it('should handle 005997 (investment other) field correctly', async () => {
      const mockBalanceSheet = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004002010', STD_ITEM_NAME: '现金及等价物', AMOUNT: 1000000000 },
          ],
          count: 1,
        },
      }

      const mockIncomeStatement = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004025002', STD_ITEM_NAME: '股东应占溢利', AMOUNT: 1000000000 },
          ],
          count: 1,
        },
      }

      const mockCashFlow = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '003999', STD_ITEM_NAME: '经营业务现金净额', AMOUNT: 2000000000 },
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '005997', STD_ITEM_NAME: '投资业务其他项目', AMOUNT: 400000000 },
          ],
          count: 2,
        },
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBalanceSheet) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIncomeStatement) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCashFlow) })

      const result = await fetchHKStockFinancialReport('00883')

      expect(result.data).not.toBeNull()
      const cnyToHkd = 1 / 1.10
      const expectedCapEx = -(400000000 / 100000000) * cnyToHkd
      expect(result.data?.capitalExpenditure[0]).toBeCloseTo(expectedCapEx, 1)
    })

    it('should handle 005007 (intangible assets) field correctly', async () => {
      const mockBalanceSheet = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004002010', STD_ITEM_NAME: '现金及等价物', AMOUNT: 1000000000 },
          ],
          count: 1,
        },
      }

      const mockIncomeStatement = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '004025002', STD_ITEM_NAME: '股东应占溢利', AMOUNT: 1000000000 },
          ],
          count: 1,
        },
      }

      const mockCashFlow = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          data: [
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '003999', STD_ITEM_NAME: '经营业务现金净额', AMOUNT: 2000000000 },
            { SECUCODE: '00883.HK', SECURITY_CODE: '00883', REPORT_DATE: '2024-12-31 00:00:00', STD_ITEM_CODE: '005007', STD_ITEM_NAME: '购建无形资产及其他资产', AMOUNT: 150000000 },
          ],
          count: 2,
        },
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBalanceSheet) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIncomeStatement) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCashFlow) })

      const result = await fetchHKStockFinancialReport('00883')

      expect(result.data).not.toBeNull()
      const cnyToHkd = 1 / 1.10
      const expectedCapEx = -(150000000 / 100000000) * cnyToHkd
      expect(result.data?.capitalExpenditure[0]).toBeCloseTo(expectedCapEx, 1)
    })
  })
})

describe('detectMarket', () => {
  it('should detect HK market for 5-digit codes', () => {
    expect(detectMarket('00700')).toBe('HK')
    expect(detectMarket('09987')).toBe('HK')
    expect(detectMarket('03613')).toBe('HK')
  })

  it('should detect HK market for codes with .HK suffix', () => {
    expect(detectMarket('00700.HK')).toBe('HK')
    expect(detectMarket('09987.HK')).toBe('HK')
  })

  it('should detect A market for 6-digit codes', () => {
    expect(detectMarket('002027')).toBe('A')
    expect(detectMarket('600519')).toBe('A')
    expect(detectMarket('000001')).toBe('A')
  })

  it('should detect A market for codes with .SH or .SZ suffix', () => {
    expect(detectMarket('600519.SH')).toBe('A')
    expect(detectMarket('002027.SZ')).toBe('A')
  })
})

describe('useFinancialReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const { loading, error, data } = useFinancialReport()

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(data.value).toBeNull()
  })
})

describe('useFinancialReportValuation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const { loading, error } = useFinancialReportValuation()

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })
})
