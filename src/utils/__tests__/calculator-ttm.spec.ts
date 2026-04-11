import { describe, it, expect } from 'vitest'
import {
  calculateSemiAnnualTTM,
  calculateQuarterlyTTM,
  detectReportType,
  calculateHistoryTTM,
  calculateCurrentTTM,
  calculateTTM
} from '../calculator'
import type { FlexibleYearlyData, FlexibleCurrentData } from '../calculator'

describe('Calculator TTM Functions', () => {
  describe('calculateSemiAnnualTTM', () => {
    it('should calculate TTM correctly for HK stocks', () => {
      // TTM = (Annual_去年 - H1_去年) + H1_今年
      // TTM = (100 - 40) + 45 = 105
      const result = calculateSemiAnnualTTM(100, 40, 45)
      expect(result).toBe(105)
    })

    it('should handle zero lastYearH1', () => {
      // TTM = (Annual - 0) + H1
      const result = calculateSemiAnnualTTM(100, 0, 45)
      expect(result).toBe(145)
    })

    it('should handle zero currentYearH1', () => {
      // TTM = (Annual - H1)
      const result = calculateSemiAnnualTTM(100, 40, 0)
      expect(result).toBe(60)
    })

    it('should handle negative values', () => {
      const result = calculateSemiAnnualTTM(100, 60, -10)
      expect(result).toBe(30)
    })

    it('should handle equal H1 values', () => {
      const result = calculateSemiAnnualTTM(100, 50, 50)
      expect(result).toBe(100)
    })
  })

  describe('calculateQuarterlyTTM', () => {
    it('should calculate TTM correctly for A-shares Q1', () => {
      // TTM = Annual_去年 - Q1_去年 + Q1_今年
      // TTM = 100 - 20 + 25 = 105
      const result = calculateQuarterlyTTM(100, 20, 25)
      expect(result).toBe(105)
    })

    it('should calculate TTM correctly for A-shares H1', () => {
      // TTM = Annual_去年 - H1_去年 + H1_今年
      const result = calculateQuarterlyTTM(100, 40, 50)
      expect(result).toBe(110)
    })

    it('should calculate TTM correctly for A-shares Q3', () => {
      // TTM = Annual_去年 - Q3_去年 + Q3_今年
      const result = calculateQuarterlyTTM(100, 70, 80)
      expect(result).toBe(110)
    })

    it('should handle zero lastYearCumulative', () => {
      const result = calculateQuarterlyTTM(100, 0, 25)
      expect(result).toBe(125)
    })

    it('should handle negative currentCumulative', () => {
      const result = calculateQuarterlyTTM(100, 40, -10)
      expect(result).toBe(50)
    })
  })

  describe('detectReportType', () => {
    it('should return semi for HK stocks (h1 only)', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2022, annual: 100, h1: 45 },
        { year: 2023, annual: 110, h1: 50 }
      ]
      expect(detectReportType(data)).toBe('semi')
    })

    it('should return quarterly for A-shares (has q1)', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2022, annual: 100, q1: 20, q3: 70 },
        { year: 2023, annual: 110, q1: 25 }
      ]
      expect(detectReportType(data)).toBe('quarterly')
    })

    it('should return quarterly for A-shares (has q3)', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2022, annual: 100, q3: 70 },
        { year: 2023, annual: 110, q3: 80 }
      ]
      expect(detectReportType(data)).toBe('quarterly')
    })

    it('should return semi for empty array', () => {
      expect(detectReportType([])).toBe('semi')
    })

    it('should return semi for data without q1 or q3', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2022, h1: 45 },
        { year: 2023, h1: 50 }
      ]
      expect(detectReportType(data)).toBe('semi')
    })
  })

  describe('calculateHistoryTTM', () => {
    it('should calculate history TTM for semi mode', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2021, annual: 100, h1: 45 },
        { year: 2022, annual: 110, h1: 50 }
      ]
      const result = calculateHistoryTTM(data, 'semi')
      expect(result.length).toBe(1)
      expect(result[0]).toEqual({
        year: 2022,
        ttm: calculateSemiAnnualTTM(100, 45, 50),
        reportType: 'semi'
      })
    })

    it('should calculate history TTM for quarterly mode with Q3', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2021, annual: 100, q3: 70 },
        { year: 2022, annual: 110, q3: 80 }
      ]
      const result = calculateHistoryTTM(data, 'quarterly')
      expect(result.length).toBe(1)
      expect(result[0].reportType).toBe('q3')
    })

    it('should calculate history TTM for quarterly mode with H1', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2021, annual: 100, h1: 40 },
        { year: 2022, annual: 110, h1: 50 }
      ]
      const result = calculateHistoryTTM(data, 'quarterly')
      expect(result.length).toBe(1)
      expect(result[0].reportType).toBe('h1')
    })

    it('should calculate history TTM for quarterly mode with Q1', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2021, annual: 100, q1: 20 },
        { year: 2022, annual: 110, q1: 25 }
      ]
      const result = calculateHistoryTTM(data, 'quarterly')
      expect(result.length).toBe(1)
      expect(result[0].reportType).toBe('q1')
    })

    it('should auto-detect report type as semi', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2021, annual: 100, h1: 45 },
        { year: 2022, annual: 110, h1: 50 }
      ]
      const result = calculateHistoryTTM(data)
      expect(result.length).toBe(1)
      expect(result[0].reportType).toBe('semi')
    })

    it('should auto-detect report type as quarterly', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2021, annual: 100, q1: 20, q3: 70 },
        { year: 2022, annual: 110, q1: 25, q3: 80 }
      ]
      const result = calculateHistoryTTM(data)
      expect(result[0].reportType).toBe('q3')
    })

    it('should sort data by year before calculating', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2023, annual: 110, h1: 50 },
        { year: 2021, annual: 100, h1: 45 }
      ]
      const result = calculateHistoryTTM(data, 'semi')
      expect(result.length).toBe(1)
      expect(result[0].year).toBe(2023)
    })

    it('should handle missing annual data', () => {
      const data: FlexibleYearlyData[] = [
        { year: 2021, h1: 45 },
        { year: 2022, annual: 110, h1: 50 }
      ]
      const result = calculateHistoryTTM(data, 'semi')
      expect(result.length).toBe(0)
    })

    it('should handle empty array', () => {
      const result = calculateHistoryTTM([])
      expect(result.length).toBe(0)
    })

      it('should skip pairs where either year is missing required data', () => {
        const data: FlexibleYearlyData[] = [
          { year: 2020, annual: 90, h1: 40 },
          { year: 2021, annual: 100 }, // missing h1
          { year: 2022, annual: 110, h1: 50 }
        ]
        const result = calculateHistoryTTM(data, 'semi')
        // Neither pair has complete data:
        // 2020->2021: currYear (2021) has no h1
        // 2021->2022: prevYear (2021) has no h1
        expect(result.length).toBe(0)
      })
  })

  describe('calculateCurrentTTM', () => {
    const prevYearData: FlexibleYearlyData = {
      year: 2022,
      annual: 100,
      h1: 45,
      q1: 20,
      q3: 70
    }

    it('should return null when prevYearData has no annual', () => {
      const result = calculateCurrentTTM(
        { year: 2022, h1: 45 },
        { h1: 50 },
        'semi'
      )
      expect(result).toBeNull()
    })

    describe('semi mode (HK stocks)', () => {
      it('should calculate TTM using H1 data', () => {
        const currentData: FlexibleCurrentData = { h1: 50 }
        const result = calculateCurrentTTM(prevYearData, currentData, 'semi')
        expect(result).toEqual({
          ttm: calculateSemiAnnualTTM(100, 45, 50),
          usedReportType: 'h1'
        })
      })

      it('should return null when current H1 is missing', () => {
        const result = calculateCurrentTTM(prevYearData, {}, 'semi')
        expect(result).toBeNull()
      })
    })

    describe('quarterly mode (A-shares)', () => {
      it('should prefer Q3 data', () => {
        const currentData: FlexibleCurrentData = { q3: 80 }
        const result = calculateCurrentTTM(prevYearData, currentData, 'quarterly')
        expect(result?.usedReportType).toBe('q3')
      })

      it('should fall back to H1 when Q3 missing', () => {
        const currentData: FlexibleCurrentData = { h1: 50 }
        const result = calculateCurrentTTM(prevYearData, currentData, 'quarterly')
        expect(result?.usedReportType).toBe('h1')
      })

      it('should fall back to Q1 when H1 and Q3 missing', () => {
        const currentData: FlexibleCurrentData = { q1: 25 }
        const result = calculateCurrentTTM(prevYearData, currentData, 'quarterly')
        expect(result?.usedReportType).toBe('q1')
      })

      it('should return null when no matching data', () => {
        const result = calculateCurrentTTM(prevYearData, {}, 'quarterly')
        expect(result).toBeNull()
      })
    })
  })

  describe('calculateTTM (deprecated alias)', () => {
    it('should call calculateSemiAnnualTTM', () => {
      const result = calculateTTM(100, 45, 50)
      expect(result).toBe(calculateSemiAnnualTTM(100, 45, 50))
    })

    it('should return correct TTM value', () => {
      // TTM = (Annual - H1) + H1 = Annual
      expect(calculateTTM(100, 50, 50)).toBe(100)
    })
  })
})
