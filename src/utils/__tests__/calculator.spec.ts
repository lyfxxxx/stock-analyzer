import { describe, it, expect } from 'vitest'
import {
  calculateNetCash,
  calculateFreeCashFlow,
  calculateValuations,
  calculateGrowthRate,
  projectCurrentYear,
  parseNumber,
  formatNumber,
  formatCurrency,
  convertFinancialData,
  convertFinancialDataArray,
  calculateCurrentRatio,
  calculatePERatio,
  getReportType,
  getSimpleMultiplier,
  extractYearFromReportDate,
  isAnnualReport
} from '../calculator'
import type { YearlyData } from '@/types/stock'

describe('Calculator', () => {
  describe('calculateNetCash', () => {
    it('should calculate net cash correctly with positive values', () => {
      const result = calculateNetCash(1000, 200, 300)
      expect(result).toBe(500) // 1000 - (200 + 300)
    })

    it('should calculate net cash correctly when cash is less than debt', () => {
      const result = calculateNetCash(100, 300, 400)
      expect(result).toBe(-600) // 100 - (300 + 400)
    })

    it('should handle zero values', () => {
      const result = calculateNetCash(0, 0, 0)
      expect(result).toBe(0)
    })

    it('should handle negative cash', () => {
      const result = calculateNetCash(-100, 200, 300)
      expect(result).toBe(-600)
    })

    it('should handle zero debt', () => {
      const result = calculateNetCash(1000, 0, 0)
      expect(result).toBe(1000)
    })
  })

  describe('calculateFreeCashFlow', () => {
    it('should calculate FCF correctly with positive capex', () => {
      const result = calculateFreeCashFlow(1000, 200)
      expect(result).toBe(800) // 1000 - |200|
    })

    it('should calculate FCF correctly with negative capex', () => {
      const result = calculateFreeCashFlow(1000, -200)
      expect(result).toBe(800) // 1000 - |-200|
    })

    it('should handle zero capex', () => {
      const result = calculateFreeCashFlow(1000, 0)
      expect(result).toBe(1000)
    })

    it('should handle zero operating cash flow', () => {
      const result = calculateFreeCashFlow(0, 200)
      expect(result).toBe(-200)
    })

    it('should handle equal values', () => {
      const result = calculateFreeCashFlow(500, 500)
      expect(result).toBe(0)
    })
  })

  describe('calculateValuations', () => {
    it('should calculate both valuations correctly', () => {
      const result = calculateValuations(1000, 200, 100, 50)
      // valuation1 = (1000 - 200) / 100 = 8
      // valuation2 = (1000 - 200) / 50 = 16
      expect(result.valuation1).toBe(8)
      expect(result.valuation2).toBe(16)
    })

    it('should return null when free cash flow is 0 or negative', () => {
      const result = calculateValuations(1000, 200, 0, 50)
      expect(result.valuation1).toBeNull()
      expect(result.valuation2).toBe(16)
    })

    it('should return null when free cash flow is negative', () => {
      const result = calculateValuations(1000, 200, -50, 50)
      expect(result.valuation1).toBeNull()
      expect(result.valuation2).toBe(16)
    })

    it('should return 0 when net profit is 0', () => {
      const result = calculateValuations(1000, 200, 100, 0)
      expect(result.valuation1).toBe(8)
      expect(result.valuation2).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      const result = calculateValuations(1000, 333, 100, 50)
      // valuation1 = (1000 - 333) / 100 = 6.67
      expect(result.valuation1).toBe(6.67)
    })

    it('should handle negative adjusted market cap with positive free cash flow', () => {
      const result = calculateValuations(100, 200, 50, 25)
      // adjusted market cap = 100 - 200 = -100
      // valuation1 = -100 / 50 = -2 (negative because net cash > market cap)
      // valuation2 = -100 / 25 = -4
      expect(result.valuation1).toBe(-2)
      expect(result.valuation2).toBe(-4)
    })
  })

  describe('calculateGrowthRate', () => {
    it('should calculate growth rate for 2 years', () => {
      const result = calculateGrowthRate([100, 120])
      expect(result).toBe(0.2) // (120-100)/100 = 0.2
    })

    it('should calculate average growth for multiple years', () => {
      // Year 1: 100, Year 2: 120 (20% growth), Year 3: 144 (20% growth)
      const result = calculateGrowthRate([100, 120, 144])
      expect(result).toBe(0.2) // Average of 0.2 and 0.2
    })

    it('should return 0 for single value', () => {
      const result = calculateGrowthRate([100])
      expect(result).toBe(0)
    })

    it('should return 0 for empty array', () => {
      const result = calculateGrowthRate([])
      expect(result).toBe(0)
    })

    it('should handle negative growth', () => {
      const result = calculateGrowthRate([100, 80])
      expect(result).toBe(-0.2)
    })

    it('should skip division by zero', () => {
      const result = calculateGrowthRate([0, 100])
      expect(result).toBe(0)
    })
  })

  describe('projectCurrentYear', () => {
    it('should project values based on growth rate', () => {
      const yearlyData: YearlyData[] = [
        { year: 2021, freeCashFlow: 100, netProfit: 50 },
        { year: 2022, freeCashFlow: 120, netProfit: 60 },
        { year: 2023, freeCashFlow: 144, netProfit: 72 }
      ]
      
      const result = projectCurrentYear(yearlyData)
      const currentYear = new Date().getFullYear()
      
      expect(result.year).toBe(currentYear)
      // 20% growth rate applied to last year values
      expect(result.freeCashFlow).toBeCloseTo(172.8, 1)
      expect(result.netProfit).toBeCloseTo(86.4, 1)
    })

    it('should handle empty array', () => {
      const result = projectCurrentYear([])
      const currentYear = new Date().getFullYear()
      
      expect(result.year).toBe(currentYear)
      expect(result.freeCashFlow).toBe(0)
      expect(result.netProfit).toBe(0)
    })

    it('should handle single year data', () => {
      const yearlyData: YearlyData[] = [
        { year: 2023, freeCashFlow: 100, netProfit: 50 }
      ]
      
      const result = projectCurrentYear(yearlyData)
      // 0% growth for single year
      expect(result.freeCashFlow).toBe(100)
      expect(result.netProfit).toBe(50)
    })

    it('should sort data before projecting', () => {
      const yearlyData: YearlyData[] = [
        { year: 2023, freeCashFlow: 144, netProfit: 72 },
        { year: 2021, freeCashFlow: 100, netProfit: 50 },
        { year: 2022, freeCashFlow: 120, netProfit: 60 }
      ]
      
      const result = projectCurrentYear(yearlyData)
      expect(result.freeCashFlow).toBeCloseTo(172.8, 1)
    })
  })

  describe('parseNumber', () => {
    it('should return number as is', () => {
      expect(parseNumber(100)).toBe(100)
      expect(parseNumber(100.5)).toBe(100.5)
    })

    it('should parse string without units', () => {
      expect(parseNumber('100')).toBe(100)
      expect(parseNumber('100.5')).toBe(100.5)
    })

    it('should parse string with Chinese units', () => {
      expect(parseNumber('100亿元')).toBe(100)
      expect(parseNumber('50万元')).toBe(50)
      expect(parseNumber('1000元')).toBe(1000)
    })

    it('should parse string with commas', () => {
      expect(parseNumber('1,000')).toBe(1000)
      expect(parseNumber('1,000,000')).toBe(1000000)
    })

    it('should handle invalid strings', () => {
      expect(parseNumber('invalid')).toBe(0)
      expect(parseNumber('')).toBe(0)
    })

    it('should handle null and undefined', () => {
      expect(parseNumber(null)).toBe(0)
      expect(parseNumber(undefined)).toBe(0)
    })
  })

  describe('formatNumber', () => {
    it('should format with 2 decimals by default', () => {
      expect(formatNumber(100)).toBe('100.00')
      expect(formatNumber(100.5)).toBe('100.50')
    })

    it('should format with custom decimals', () => {
      expect(formatNumber(100.555, 1)).toBe('100.6')
      expect(formatNumber(100, 0)).toBe('100')
    })

    it('should handle NaN', () => {
      expect(formatNumber(NaN)).toBe('-')
    })

    it('should handle Infinity', () => {
      expect(formatNumber(Infinity)).toBe('-')
      expect(formatNumber(-Infinity)).toBe('-')
    })

    it('should use zh-CN locale', () => {
      expect(formatNumber(1000000)).toContain(',')
    })
  })

  describe('formatCurrency', () => {
    it('should format with 亿元 suffix', () => {
      expect(formatCurrency(100)).toBe('100.00 亿元')
      expect(formatCurrency(100.5)).toBe('100.50 亿元')
    })

    it('should handle NaN', () => {
      expect(formatCurrency(NaN)).toBe('-')
    })

    it('should handle Infinity', () => {
      expect(formatCurrency(Infinity)).toBe('-')
    })
  })

  describe('Currency Conversion', () => {
    const rates = {
      USD: 7.75,
      HKD: 1.00,
      CNY: 1.10
    }

    describe('convertFinancialData', () => {
      it('should convert USD to HKD', () => {
        // Input: 1 亿元 USD → Output: 7.75 亿元 HKD
        expect(convertFinancialData(1, 'USD', rates)).toBe(7.75)
      })

      it('should convert CNY to HKD', () => {
        // Input: 1 亿元 CNY → Output: 1.10 亿元 HKD
        expect(convertFinancialData(1, 'CNY', rates)).toBe(1.10)
      })

      it('should return same value for HKD', () => {
        // Input: 1 亿元 HKD → Output: 1 亿元 HKD
        expect(convertFinancialData(1, 'HKD', rates)).toBe(1)
      })

      it('should handle OTHER currency as 1:1', () => {
        expect(convertFinancialData(1, 'OTHER', rates)).toBe(1)
      })

      it('should handle zero value', () => {
        expect(convertFinancialData(0, 'USD', rates)).toBe(0)
      })

      it('should convert multiple units correctly', () => {
        // Input: 0.01 亿元 USD = 0.01 * 7.75 = 0.0775 亿元 HKD
        expect(convertFinancialData(0.01, 'USD', rates)).toBe(0.0775)
      })
    })

    describe('convertFinancialDataArray', () => {
      it('should convert array of values', () => {
        const values = [1, 2, 3] // 亿元
        const result = convertFinancialDataArray(values, 'USD', rates)
        
        expect(result).toEqual([7.75, 15.5, 23.25])
      })

      it('should handle empty array', () => {
        const result = convertFinancialDataArray([], 'USD', rates)
        expect(result).toEqual([])
      })

      it('should handle array with zeros', () => {
        const values = [0, 1, 0] // 亿元
        const result = convertFinancialDataArray(values, 'USD', rates)
        
        expect(result).toEqual([0, 7.75, 0])
      })
    })
  })

  describe('calculateCurrentRatio', () => {
    it('should calculate ratio correctly', () => {
      const result = calculateCurrentRatio(1000, 500)
      expect(result).toBe(2)
    })

    it('should round to 2 decimal places', () => {
      const result = calculateCurrentRatio(1000, 333)
      expect(result).toBe(3)
    })

    it('should return null when currentAssets is null', () => {
      const result = calculateCurrentRatio(null, 500)
      expect(result).toBeNull()
    })

    it('should return null when currentLiabilities is null', () => {
      const result = calculateCurrentRatio(1000, null)
      expect(result).toBeNull()
    })

    it('should return null when currentAssets is 0', () => {
      const result = calculateCurrentRatio(0, 500)
      expect(result).toBeNull()
    })

    it('should return null when currentLiabilities is 0', () => {
      const result = calculateCurrentRatio(1000, 0)
      expect(result).toBeNull()
    })
  })

  describe('calculatePERatio', () => {
    it('should calculate PE ratio correctly', () => {
      const result = calculatePERatio(1000, 100)
      expect(result).toBe(10)
    })

    it('should round to 1 decimal place', () => {
      const result = calculatePERatio(1000, 333)
      expect(result).toBe(3)
    })

    it('should return null when marketCap is null', () => {
      const result = calculatePERatio(null, 100)
      expect(result).toBeNull()
    })

    it('should return null when netProfit is null', () => {
      const result = calculatePERatio(1000, null)
      expect(result).toBeNull()
    })

    it('should return null when marketCap is 0', () => {
      const result = calculatePERatio(0, 100)
      expect(result).toBeNull()
    })

    it('should return null when netProfit is 0', () => {
      const result = calculatePERatio(1000, 0)
      expect(result).toBeNull()
    })

    it('should return null when netProfit is negative', () => {
      const result = calculatePERatio(1000, -50)
      expect(result).toBeNull()
    })
  })

  describe('getReportType', () => {
    it('should return annual for 12-31 date', () => {
      expect(getReportType('2023-12-31')).toBe('annual')
    })

    it('should return Q1 for 03-31 date', () => {
      expect(getReportType('2023-03-31')).toBe('Q1')
    })

    it('should return H1 for 06-30 date', () => {
      expect(getReportType('2023-06-30')).toBe('H1')
    })

    it('should return Q3 for 09-30 date', () => {
      expect(getReportType('2023-09-30')).toBe('Q3')
    })

    it('should return annual for non-standard date (default)', () => {
      expect(getReportType('2023-05-15')).toBe('annual')
    })

    it('should handle string input', () => {
      expect(getReportType(20231231)).toBe('annual')
    })
  })

  describe('getSimpleMultiplier', () => {
    it('should return 1.0 for annual', () => {
      expect(getSimpleMultiplier('annual')).toBe(1.0)
    })

    it('should return 4.0 for Q1', () => {
      expect(getSimpleMultiplier('Q1')).toBe(4.0)
    })

    it('should return 2.0 for H1', () => {
      expect(getSimpleMultiplier('H1')).toBe(2.0)
    })

    it('should return 4/3 for Q3', () => {
      expect(getSimpleMultiplier('Q3')).toBeCloseTo(4 / 3)
    })
  })

  describe('extractYearFromReportDate', () => {
    it('should extract year from standard date format', () => {
      expect(extractYearFromReportDate('2023-12-31')).toBe(2023)
    })

    it('should extract year from early year', () => {
      expect(extractYearFromReportDate('2020-06-30')).toBe(2020)
    })

    it('should extract year from late year', () => {
      expect(extractYearFromReportDate('2030-03-31')).toBe(2030)
    })
  })

  describe('isAnnualReport', () => {
    it('should return true for 12-31 date', () => {
      expect(isAnnualReport('2023-12-31')).toBe(true)
    })

    it('should return false for 03-31 date', () => {
      expect(isAnnualReport('2023-03-31')).toBe(false)
    })

    it('should return false for 06-30 date', () => {
      expect(isAnnualReport('2023-06-30')).toBe(false)
    })

    it('should return false for 09-30 date', () => {
      expect(isAnnualReport('2023-09-30')).toBe(false)
    })
  })
})
